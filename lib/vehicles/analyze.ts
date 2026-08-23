import type { VehicleContext } from "@/types/ai";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";
import { logEvent } from "@/lib/observability/log";
import { fetchListingDetail } from "@/lib/sources/coches-net/fetch-listing-detail";
import { searchAllComparables, toSourceCitations } from "@/lib/sources/registry";
import { saveAnalysis } from "@/lib/store/vehicle-store";
import { createVehicleId } from "@/lib/utils/math";
import { analyzeListing } from "@/lib/valuation/listing-analysis";
import { scoreListingQuality } from "@/lib/valuation/listing-quality";
import { buildInspectionChecklist } from "@/lib/valuation/inspection";
import { buildPurchaseVerdict } from "@/lib/valuation/purchase-verdict";
import { valueVehicle } from "@/lib/valuation/engine";
import { scoreVehicle } from "@/lib/valuation/scores";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { toCanonicalVehicle } from "@/lib/vehicles/canonical";
import { validateVehicleConsistency, vehicleForRetrieval } from "@/lib/vehicles/consistency";
import { lookupKnowledge } from "@/lib/vehicles/knowledge-base";
import { buildMissingDataReport } from "@/lib/vehicles/missing-data";
import { vehicleInputSchema } from "@/lib/vehicles/schema";

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
    logEvent("vehicle.extraction", {
      url: vehicle.listingUrl,
      ok: Boolean(detail),
      price: detail?.price,
      mileage: detail?.mileage,
    });
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

  const consistency = validateVehicleConsistency(vehicle);
  logEvent(
    "vehicle.validation",
    {
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version,
      fuel: vehicle.fuel,
      status: consistency.status,
      issues: consistency.issues.map((issue) => issue.code),
    },
    consistency.status === "valid" ? "info" : "warn",
  );

  const retrievalVehicle = vehicleForRetrieval(vehicle, consistency);
  const identityValid = consistency.status !== "invalid";

  const id = createVehicleId([
    vehicle.brand,
    vehicle.model,
    vehicle.version ?? "",
    String(vehicle.year),
    String(vehicle.mileage),
    String(vehicle.advertisedPrice ?? "na"),
  ]);

  const query = {
    brand: retrievalVehicle.brand,
    model: retrievalVehicle.model,
    version: identityValid ? retrievalVehicle.version : undefined,
    year: vehicle.year,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    power: vehicle.power,
    bodyType: vehicle.bodyType,
    location: vehicle.location,
  };

  logEvent("market.search", {
    brand: query.brand,
    model: query.model,
    version: query.version,
    year: query.year,
    fuel: query.fuel,
  });

  const search = await searchAllComparables(query);
  const liveListings = search.listings.filter((listing) => !listing.isDemo && !listing.isCompetitor);
  const comparables = liveListings;
  logEvent("market.results", {
    count: comparables.length,
    notes: search.notes.slice(0, 3),
  });

  const knowledge = lookupKnowledge(retrievalVehicle, {
    blocked: !identityValid,
    reason: consistency.summary,
  });
  const valuation = valueVehicle(vehicle, comparables);
  const listingQuality = scoreListingQuality(vehicle);
  const missingData = buildMissingDataReport(vehicle);
  const scores = scoreVehicle({
    vehicle,
    valuation,
    reliability: knowledge.reliability,
    listings: comparables,
    listingQuality,
  });
  const listingAnalysis = analyzeListing(vehicle, valuation.verdict, {
    marketObserved: valuation.origin === "observed" && valuation.marketStatus === "observed",
    listingQuality,
  });
  const sellerQuestions = buildSellerQuestions(
    vehicle,
    knowledge.reliability.knownIssues,
    knowledge.knowledgeChunks,
    { identityValid },
  );
  const inspectionChecklist = buildInspectionChecklist(vehicle);
  const purchaseVerdict = buildPurchaseVerdict({ consistency, valuation, listingQuality });
  const canonicalVehicle = toCanonicalVehicle(vehicle);

  const hasKnowledge = knowledge.reliability.available || knowledge.maintenance.available;
  const dataMode = resolveDataMode({
    hasLiveListings: comparables.length > 0,
    hasKnowledge,
  });

  const limitations = [...valuation.limitations, ...listingAnalysis.limitations];
  if (consistency.status !== "valid") {
    limitations.unshift(consistency.summary);
  }
  if (comparables.length === 0) {
    limitations.push("Sin suficientes anuncios comparables. No se finge un mercado.");
  }
  if (comparables.some((listing) => listing.source === "coches.net")) {
    limitations.push(
      "Los comparables proceden de anuncios públicos de coches.net (mercado España).",
    );
  }
  if (search.notes.length > 0 && comparables.length === 0) {
    limitations.push(...search.notes.slice(0, 3));
  }
  if (hasKnowledge) {
    limitations.push(
      "La fiabilidad procede de evidencia A/B del corpus. No sustituye inspección ni informes oficiales de este bastidor.",
    );
  } else if (identityValid) {
    limitations.push(
      "No tenemos evidencia suficiente para afirmar problemas conocidos de este modelo.",
    );
  }

  const analysis: AnalyzeResponse = {
    id,
    generatedAt: new Date().toISOString(),
    dataMode,
    vehicle: { ...vehicle, id },
    canonicalVehicle,
    consistency,
    purchaseVerdict,
    missingData,
    listingQuality,
    inspectionChecklist,
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
