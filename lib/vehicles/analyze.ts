import type { VehicleContext } from "@/types/ai";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";
import { analysisLog } from "@/lib/observability/analysis-log";
import { fetchListingDetailFromUrl } from "@/lib/sources/listing-detail";
import { saveAnalysis } from "@/lib/store/vehicle-store";
import { createVehicleId } from "@/lib/utils/math";
import { analyzeListing } from "@/lib/valuation/listing-analysis";
import { valueVehicle } from "@/lib/valuation/engine";
import { scoreVehicle } from "@/lib/valuation/scores";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { validateVehicleConsistency } from "@/lib/vehicles/consistency";
import { resolveVehicleIdentity } from "@/lib/vehicles/identity";
import { buildInspectionChecklist } from "@/lib/vehicles/inspection-checklist";
import { lookupKnowledge } from "@/lib/vehicles/knowledge-base";
import { resolveVehicleComponentCodes } from "@/lib/vehicles/component-codes";
import { emptySharedComponentsSummary } from "@/lib/rag/knowledge/shared-components";
import { detectMissingData } from "@/lib/vehicles/missing-data";
import { buildPurchaseVerdict } from "@/lib/vehicles/purchase-verdict";
import { vehicleInputSchema } from "@/lib/vehicles/schema";
import { searchAllComparables, toSourceCitations } from "@/lib/sources/registry";
import { isAllowedListingUrl } from "@/lib/vehicles/url-policy";

function resolveDataMode(options: {
  hasLiveListings: boolean;
  hasKnowledge: boolean;
  knowledgeIsDemo: boolean;
}): AnalyzeResponse["dataMode"] {
  if (options.hasLiveListings && options.hasKnowledge && !options.knowledgeIsDemo) return "mixed";
  if (options.hasLiveListings && options.knowledgeIsDemo) return "mixed";
  if (options.hasLiveListings) return "live";
  if (options.hasKnowledge && options.knowledgeIsDemo) return "demo";
  if (options.hasKnowledge) return "knowledge";
  return "demo";
}

export async function analyzeVehicle(input: VehicleInput): Promise<AnalyzeResponse> {
  const parsedInput = vehicleInputSchema.parse(input);
  let vehicle: VehicleInput = { ...parsedInput };
  const trimSlugInput = parsedInput.trimSlug;
  const listingDetailNotes: string[] = [];
  let listingScraped = false;

  analysisLog.vehicleExtraction({
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    trimSlug: trimSlugInput,
    year: vehicle.year,
    fuel: vehicle.fuel,
    hasListingUrl: Boolean(vehicle.listingUrl),
  });

  if (vehicle.listingUrl) {
    if (!isAllowedListingUrl(vehicle.listingUrl)) {
      listingDetailNotes.push(
        "URL de anuncio rechazada: solo se aceptan fichas https de coches.net o AutoScout24.",
      );
    } else {
      const detail = await fetchListingDetailFromUrl(vehicle.listingUrl);
      if (detail) {
        listingScraped = true;
        vehicle = {
          ...vehicle,
          advertisedPrice: detail.price ?? vehicle.advertisedPrice,
          mileage: detail.mileage ?? vehicle.mileage,
          power: detail.power ?? vehicle.power,
          year: detail.year ?? vehicle.year,
          fuel: detail.fuel ?? vehicle.fuel,
          transmission: detail.transmission ?? vehicle.transmission,
          location: detail.location ?? vehicle.location,
          description: vehicle.description ?? detail.description,
          equipment:
            vehicle.equipment ??
            (detail.equipment?.length ? detail.equipment.join(", ") : undefined),
        };
        listingDetailNotes.push("Ficha del anuncio scrapeada correctamente.");
        if (detail.description) {
          listingDetailNotes.push(`Descripción: ${detail.description.length} caracteres.`);
        }
        if (detail.equipment?.length) {
          listingDetailNotes.push(
            `Equipamiento detectado: ${detail.equipment.slice(0, 8).join(", ")}.`,
          );
        }
      } else {
        listingDetailNotes.push(
          "No se pudo scrapear la ficha individual (antibot o página vacía). Se usará búsqueda por resultados.",
        );
      }
    }
  }

  const identity = resolveVehicleIdentity(vehicle, { trimSlug: trimSlugInput ?? vehicle.trimSlug });
  vehicle = { ...identity.vehicle, trimSlug: identity.trimResolution.trimSlug ?? trimSlugInput };

  const effectiveConsistency = validateVehicleConsistency(vehicle, {
    trimSlug: vehicle.trimSlug,
    trimCatalogVerified: identity.evidence.trimCatalogMatch,
  });

  analysisLog.vehicleValidation({
    status: effectiveConsistency.status,
    issues: effectiveConsistency.issues.map((i) => i.code),
    trimCatalogMatch: effectiveConsistency.trimCatalogMatch,
    blockModelKnowledge: effectiveConsistency.blockModelKnowledge,
  });

  const id = createVehicleId([
    vehicle.brand,
    vehicle.model,
    vehicle.version ?? "",
    String(vehicle.year),
    String(vehicle.mileage),
    String(vehicle.advertisedPrice ?? "na"),
  ]);

  const query = {
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    year: vehicle.year,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    power: vehicle.power,
    bodyType: vehicle.bodyType,
    location: vehicle.location,
  };

  let comparables: AnalyzeResponse["comparables"] = [];
  let searchNotes: string[] = [];
  let search: Awaited<ReturnType<typeof searchAllComparables>> = {
    listings: [],
    documents: [],
    isDemo: false,
    fetchedAt: new Date().toISOString(),
    notes: [],
    connected: false,
  };

  if (effectiveConsistency.blockMarketSearch) {
    searchNotes = [
      "Búsqueda de mercado omitida: la identidad del vehículo es incoherente (p. ej. versión de otra marca).",
    ];
    analysisLog.marketSearch({ skipped: true, reason: "inconsistent_identity" });
  } else {
    search = await searchAllComparables(query).catch((error: unknown) => {
      analysisLog.fallback({
        reason: "market_search_failed",
        message: error instanceof Error ? error.message : "unknown",
      });
      return {
        listings: [],
        documents: [],
        isDemo: false,
        fetchedAt: new Date().toISOString(),
        notes: ["Búsqueda de mercado no disponible."],
        connected: false,
      };
    });
    searchNotes = search.notes;
    comparables = search.listings.filter((listing) => !listing.isDemo && !listing.isCompetitor);
    analysisLog.marketSearch({
      skipped: false,
      requested: query,
    });
    analysisLog.marketResults({
      count: comparables.length,
      sources: Array.from(new Set(comparables.map((l) => l.source))),
    });
  }

  const componentCodes = resolveVehicleComponentCodes(vehicle, {
    identity: identity.evidence,
    trim: identity.trimResolution.trim,
  });

  const knowledge = effectiveConsistency.blockModelKnowledge
    ? {
        reliability: {
          available: false,
          score: null,
          notes: [
            "No se consulta conocimiento técnico del modelo mientras los datos del vehículo sean incoherentes.",
            effectiveConsistency.summary,
          ],
          knownIssues: [],
          isDemo: false,
          source: "Bloqueado por validación de coherencia",
        },
        sharedComponents: emptySharedComponentsSummary(
          "Componentes compartidos bloqueados hasta corregir marca/modelo/versión/combustible.",
        ),
        maintenance: {
          available: false,
          notes: [
            "Mantenimiento específico del modelo bloqueado hasta corregir marca/modelo/versión/combustible.",
          ],
          upcoming: [],
          isDemo: false,
          source: "Bloqueado por validación de coherencia",
        },
        knowledgeChunks: [],
      }
    : lookupKnowledge(vehicle, componentCodes);

  analysisLog.ragRetrieval({
    blocked: effectiveConsistency.blockModelKnowledge,
    chunkCount: knowledge.knowledgeChunks.length,
    reliabilityAvailable: knowledge.reliability.available,
    issues: knowledge.reliability.knownIssues.length,
    sharedComponents: knowledge.sharedComponents.issues.length,
  });
  analysisLog.ragConfidence({
    isDemo: knowledge.reliability.isDemo,
    score: knowledge.reliability.score,
  });

  const valuation = valueVehicle(vehicle, comparables);
  const listingAnalysis = analyzeListing(vehicle, valuation.verdict, {
    marketObserved: valuation.origin === "observed",
    insufficientMarket: valuation.insufficientMarketData,
    listingScraped,
  });
  const scores = scoreVehicle({
    vehicle,
    valuation,
    reliability: knowledge.reliability,
    listings: comparables,
    listingQualityScore: listingAnalysis.qualityScore,
    consistencyInvalid: effectiveConsistency.status === "invalid",
  });
  const sellerQuestions = buildSellerQuestions(
    vehicle,
    knowledge.reliability.knownIssues,
    knowledge.knowledgeChunks,
    {
      blockModelSpecific: effectiveConsistency.blockModelKnowledge,
      sharedComponentIssues: knowledge.sharedComponents.issues,
    },
  );
  const missingData = detectMissingData(vehicle);
  const inspectionChecklist = buildInspectionChecklist(vehicle);
  const purchaseVerdict = buildPurchaseVerdict({
    vehicle,
    valuation,
    scores,
    consistencyStatus: effectiveConsistency.status,
    hasModelKnowledge: knowledge.reliability.available,
    listingRisk: listingAnalysis.risk,
  });

  const hasKnowledge = knowledge.reliability.available || knowledge.maintenance.available;
  const dataMode = resolveDataMode({
    hasLiveListings: comparables.length > 0,
    hasKnowledge,
    knowledgeIsDemo: knowledge.reliability.isDemo || knowledge.maintenance.isDemo,
  });

  const limitations = [
    ...effectiveConsistency.issues.filter((i) => i.severity === "error").map((i) => i.message),
    ...valuation.limitations,
    ...listingAnalysis.limitations,
  ];
  if (effectiveConsistency.status === "invalid") {
    limitations.unshift(
      "IDENTIDAD INVÁLIDA: corrige marca/modelo/versión/combustible antes de usar precio o conocimiento técnico.",
    );
  }
  if (comparables.length === 0 && !effectiveConsistency.blockMarketSearch) {
    limitations.push(
      "No se obtuvieron anuncios comparables suficientes. No se publica un precio de mercado inventado.",
    );
  }
  if (comparables.some((listing) => listing.source === "coches.net")) {
    limitations.push(
      "Los comparables proceden de anuncios públicos de coches.net (mercado España).",
    );
  }
  if (comparables.some((listing) => listing.source === "autoscout24")) {
    limitations.push(
      "Los comparables proceden de anuncios públicos de AutoScout24 (mercado España).",
    );
  }
  if (searchNotes.length > 0 && comparables.length === 0) {
    limitations.push(...searchNotes.slice(0, 3));
  }
  if (hasKnowledge) {
    limitations.push(
      knowledge.reliability.isDemo
        ? "El corpus técnico incluye entradas demo/pendientes de revisión. No sustituyen inspección ni informes oficiales."
        : "La fiabilidad procede de conocimiento del modelo (RAG). No sustituye inspección de este bastidor.",
    );
  } else if (!effectiveConsistency.blockModelKnowledge) {
    limitations.push(
      "No tenemos evidencia suficiente para afirmar problemas conocidos específicos de este modelo.",
    );
  }

  const analysis: AnalyzeResponse = {
    id,
    generatedAt: new Date().toISOString(),
    dataMode,
    vehicle: { ...vehicle, id },
    valuation,
    scores,
    comparables: comparables
      .slice()
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, 24),
    alternatives: [],
    sources: toSourceCitations(comparables, search),
    searchNotes,
    listingDetailNotes: listingDetailNotes.length > 0 ? listingDetailNotes : undefined,
    listingAnalysis,
    sellerQuestions,
    reliability: knowledge.reliability,
    sharedComponents: knowledge.sharedComponents,
    maintenance: knowledge.maintenance,
    limitations: Array.from(new Set(limitations)),
    consistency: effectiveConsistency,
    identityEvidence: identity.evidence,
    purchaseVerdict,
    missingData,
    inspectionChecklist,
  };

  await saveAnalysis(analysis);
  return analysis;
}

export function toVehicleContext(analysis: AnalyzeResponse): VehicleContext {
  return {
    vehicle: analysis.vehicle,
    marketData: analysis.valuation,
    comparableListings: analysis.comparables,
    alternatives: analysis.alternatives,
    reliabilityData: analysis.reliability,
    sharedComponentsData: analysis.sharedComponents,
    maintenanceData: analysis.maintenance,
    sourceData: analysis.sources,
  };
}
