import type { VehicleContext } from "@/types/ai";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";
import { fetchListingDetail } from "@/lib/sources/coches-net/fetch-listing-detail";
import { searchAllComparables, toSourceCitations } from "@/lib/sources/registry";
import { saveAnalysis } from "@/lib/store/vehicle-store";
import { createVehicleId } from "@/lib/utils/math";
import { analyzeListing } from "@/lib/valuation/listing-analysis";
import { valueVehicle } from "@/lib/valuation/engine";
import { buildPurchaseRecommendation, scoreVehicle } from "@/lib/valuation/scores";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import {
  buildMissingDataSuggestions,
  validateVehicleConsistency,
} from "@/lib/vehicles/consistency-validator";
import { lookupKnowledge } from "@/lib/vehicles/knowledge-base";
import { vehicleInputSchema } from "@/lib/vehicles/schema";
import { analysisLogger } from "@/lib/observability/analysis-logger";

function resolveDataMode(options: {
  hasLiveListings: boolean;
  hasKnowledge: boolean;
}): AnalyzeResponse["dataMode"] {
  if (options.hasLiveListings && options.hasKnowledge) return "mixed";
  if (options.hasLiveListings) return "live";
  if (options.hasKnowledge) return "knowledge";
  return "knowledge";
}

export async function analyzeVehicle(input: VehicleInput): Promise<AnalyzeResponse> {
  let vehicle = vehicleInputSchema.parse(input);
  const listingDetailNotes: string[] = [];

  if (vehicle.listingUrl) {
    const detail = await fetchListingDetail(vehicle.listingUrl);
    if (detail) {
      vehicle = {
        ...vehicle,
        advertisedPrice: detail.price ?? vehicle.advertisedPrice,
        mileage: detail.mileage ?? vehicle.mileage,
        power: detail.power ?? vehicle.power,
        year: detail.year ?? vehicle.year,
        fuel: detail.fuel ?? vehicle.fuel,
        transmission: detail.transmission ?? vehicle.transmission,
        location: detail.location ?? vehicle.location,
        equipment:
          vehicle.equipment ??
          (detail.equipment?.length ? detail.equipment.join(", ") : undefined),
      };
      listingDetailNotes.push("Ficha del anuncio scrapeada correctamente.");
      if (detail.description) listingDetailNotes.push(`Descripción: ${detail.description.length} caracteres.`);
      if (detail.equipment?.length) {
        listingDetailNotes.push(`Equipamiento detectado: ${detail.equipment.slice(0, 8).join(", ")}.`);
      }
    } else {
      listingDetailNotes.push(
        "No se pudo scrapear la ficha individual (antibot o página vacía). Se usará búsqueda por resultados.",
      );
    }
  }

  const validation = validateVehicleConsistency(vehicle);
  analysisLogger.vehicleValidation({
    severity: validation.severity,
    issueCount: validation.issues.length,
    brand: vehicle.brand,
    model: vehicle.model,
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

  const search = await searchAllComparables(query);
  const liveListings = search.listings.filter((listing) => !listing.isDemo && !listing.isCompetitor);
  const comparables = liveListings;
  analysisLogger.marketSearch({
    comparableCount: comparables.length,
    brand: vehicle.brand,
    model: vehicle.model,
  });
  const allowModelKnowledge = validation.canUseModelSpecificKnowledge;
  const knowledge = lookupKnowledge(vehicle, { allowModelKnowledge });
  analysisLogger.ragRetrieval({
    chunkCount: knowledge.knowledgeChunks.length,
    modelSpecificIssues: knowledge.reliability.knownIssues.length,
    segmentNotes: knowledge.reliability.segmentNotes?.length ?? 0,
    brand: vehicle.brand,
    model: vehicle.model,
  });
  if (!allowModelKnowledge) {
    analysisLogger.fallback("model_knowledge_blocked", {
      brand: vehicle.brand,
      model: vehicle.model,
      issues: validation.issues.map((i) => i.code),
    });
  }
  const valuation = valueVehicle(vehicle, comparables);
  const scores = scoreVehicle({
    vehicle,
    valuation,
    reliability: knowledge.reliability,
    listings: comparables,
    validation,
  });

  // Enrich listing score dimension from listing analysis
  const listingAnalysis = analyzeListing(vehicle, valuation.verdict, {
    marketObserved: valuation.origin === "observed",
  });
  const listingDimension = scores.dimensions.find((d) => d.id === "listing");
  if (listingDimension && listingAnalysis.qualityScore != null) {
    listingDimension.score = listingAnalysis.qualityScore;
    listingDimension.insufficientData = listingAnalysis.qualityScore < 40;
    listingDimension.reason = `Calidad de la información del anuncio: ${listingAnalysis.qualityScore}/100.`;
  }

  const sellerQuestions = buildSellerQuestions(
    vehicle,
    knowledge.reliability.knownIssues,
    knowledge.knowledgeChunks,
  );

  const purchaseRecommendation = buildPurchaseRecommendation({
    vehicle,
    valuation,
    scores,
    validation,
    reliability: knowledge.reliability,
  });

  const missingData = buildMissingDataSuggestions(vehicle);

  const hasKnowledge =
    allowModelKnowledge &&
    (knowledge.reliability.available || knowledge.maintenance.available);
  const dataMode = resolveDataMode({
    hasLiveListings: comparables.length > 0,
    hasKnowledge,
  });

  const limitations = [...valuation.limitations, ...listingAnalysis.limitations];
  if (!validation.isConsistent) {
    limitations.unshift(
      ...validation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message),
    );
  }
  if (comparables.length === 0) {
    limitations.push(
      "No se obtuvieron anuncios de coches.net. El precio de mercado es una estimación orientativa por segmento, no una mediana de anuncios reales.",
    );
  }
  if (comparables.some((listing) => listing.source === "coches.net")) {
    limitations.push(
      "Los comparables proceden de anuncios públicos de coches.net (mercado España). El valor estimado es la mediana de esos anuncios filtrados por modelo y año próximo.",
    );
  }
  if (search.notes.length > 0 && comparables.length === 0) {
    limitations.push(...search.notes.slice(0, 3));
  }
  if (hasKnowledge) {
    limitations.push(
      "La fiabilidad y el mantenimiento proceden de una base de conocimiento curada (RAG). No sustituyen inspección mecánica ni informes oficiales de este bastidor.",
    );
  }
  if (knowledge.reliability.segmentNotes && knowledge.reliability.segmentNotes.length > 0) {
    limitations.push(
      "Las notas de segmento (combustible/tipo) no se presentan como problemas confirmados de este modelo concreto.",
    );
  }

  const analysis: AnalyzeResponse = {
    id,
    generatedAt: new Date().toISOString(),
    dataMode,
    vehicle: { ...vehicle, id },
    validation,
    purchaseRecommendation,
    missingData,
    valuation,
    scores,
    comparables: comparables
      .slice()
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, 24),
    alternatives: [],
    sources: toSourceCitations(comparables, search),
    searchNotes: search.notes,
    listingDetailNotes: listingDetailNotes.length > 0 ? listingDetailNotes : undefined,
    listingAnalysis,
    sellerQuestions,
    reliability: knowledge.reliability,
    maintenance: knowledge.maintenance,
    limitations: Array.from(new Set(limitations)),
  };

  await saveAnalysis(analysis);
  analysisLogger.analysisComplete({
    id: analysis.id,
    dataMode: analysis.dataMode,
    canUseModelKnowledge: allowModelKnowledge,
  });
  return analysis;
}

export function toVehicleContext(analysis: AnalyzeResponse): VehicleContext {
  return {
    vehicle: analysis.vehicle,
    marketData: analysis.valuation,
    comparableListings: analysis.comparables,
    alternatives: analysis.alternatives,
    reliabilityData: analysis.reliability,
    maintenanceData: analysis.maintenance,
    sourceData: analysis.sources,
  };
}
