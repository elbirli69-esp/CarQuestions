import type { VehicleContext } from "@/types/ai";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";
import { searchAllComparables, toSourceCitations } from "@/lib/sources/registry";
import { saveAnalysis } from "@/lib/store/vehicle-store";
import { createVehicleId } from "@/lib/utils/math";
import { analyzeListing } from "@/lib/valuation/listing-analysis";
import { valueVehicle } from "@/lib/valuation/engine";
import { scoreVehicle } from "@/lib/valuation/scores";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { lookupKnowledge } from "@/lib/vehicles/knowledge-base";
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
  const vehicle = vehicleInputSchema.parse(input);
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
  const knowledge = lookupKnowledge(vehicle);
  const valuation = valueVehicle(vehicle, comparables);
  const scores = scoreVehicle({
    vehicle,
    valuation,
    reliability: knowledge.reliability,
    listings: comparables,
  });
  const listingAnalysis = analyzeListing(vehicle, valuation.verdict);
  const sellerQuestions = buildSellerQuestions(vehicle, knowledge.reliability.knownIssues);

  const hasKnowledge = knowledge.reliability.available || knowledge.maintenance.available;
  const dataMode = resolveDataMode({
    hasLiveListings: comparables.length > 0,
    hasKnowledge,
  });

  const limitations = [...valuation.limitations];
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
  if (hasKnowledge) {
    limitations.push(
      "La fiabilidad y el mantenimiento proceden de una base de conocimiento curada (RAG). No sustituyen inspección mecánica ni informes oficiales de este bastidor.",
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
    listingAnalysis,
    sellerQuestions,
    reliability: knowledge.reliability,
    maintenance: knowledge.maintenance,
    limitations,
  };

  saveAnalysis(analysis);
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
