import type { VehicleContext } from "@/types/ai";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";
import { buildDemoAlternatives } from "@/lib/sources/demo-listings";
import { searchAllComparables, toSourceCitations } from "@/lib/sources/registry";
import { saveAnalysis } from "@/lib/store/vehicle-store";
import { createVehicleId } from "@/lib/utils/math";
import { analyzeListing } from "@/lib/valuation/listing-analysis";
import { valueVehicle } from "@/lib/valuation/engine";
import { scoreVehicle } from "@/lib/valuation/scores";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { lookupKnowledge } from "@/lib/vehicles/knowledge-base";
import { vehicleInputSchema } from "@/lib/vehicles/schema";

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
  const comparables = search.listings.filter((listing) => !listing.isCompetitor);
  const alternatives = buildDemoAlternatives(query);
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

  const analysis: AnalyzeResponse = {
    id,
    generatedAt: new Date().toISOString(),
    dataMode: "demo",
    vehicle: { ...vehicle, id },
    valuation,
    scores,
    comparables: comparables
      .slice()
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, 24),
    alternatives,
    sources: toSourceCitations(comparables, search),
    listingAnalysis,
    sellerQuestions,
    reliability: knowledge.reliability,
    maintenance: knowledge.maintenance,
    limitations: [
      ...valuation.limitations,
      "Ningún portal real está conectado en este MVP. Los anuncios, percentiles y scores de fiabilidad de demostración no deben usarse para comprar.",
    ],
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
