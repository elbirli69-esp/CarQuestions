import type { VehicleContext } from "@/types/ai";
import type { AnalyzeResponse, ListingAnalysis } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";
import { fetchListingDetail } from "@/lib/sources/coches-net/fetch-listing-detail";
import { searchAllComparables, toSourceCitations } from "@/lib/sources/registry";
import { saveAnalysis } from "@/lib/store/vehicle-store";
import { createVehicleId } from "@/lib/utils/math";
import { buildBuyVerdict } from "@/lib/valuation/buy-verdict";
import { buildInspectionChecklist } from "@/lib/valuation/inspection-checklist";
import {
  knowledgeToMaintenance,
  knowledgeToReliability,
} from "@/lib/valuation/knowledge-adapter";
import { assessListingQuality } from "@/lib/valuation/listing-quality";
import { marketToLegacyValuation } from "@/lib/valuation/market-adapter";
import { valueOnMarket } from "@/lib/valuation/market-engine";
import { detectMissingData } from "@/lib/valuation/missing-data";
import { buildScorecard } from "@/lib/valuation/scorecard";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { AnalysisTimer } from "@/lib/vehicles/diagnostics";
import { validateVehicleConsistency } from "@/lib/vehicles/identity/consistency";
import { buildTechnicalKnowledge } from "@/lib/vehicles/technical-knowledge";
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

function legacyListingAnalysis(
  vehicle: AnalyzeResponse["vehicle"],
  market: AnalyzeResponse["market"],
  listingQuality: AnalyzeResponse["listingQuality"],
): ListingAnalysis {
  const priceLabel =
    market.status === "observed" && market.percentDifference != null
      ? market.verdictLabel
      : market.status === "observed"
        ? "Normal"
        : "Sin mercado";

  return {
    available: true,
    price: priceLabel,
    vehicle: listingQuality.level === "pobre" ? "Datos insuficientes" : "Pendiente de inspección",
    description:
      listingQuality.score >= 75 ? "Completa" : listingQuality.score >= 45 ? "Normal" : "Escasa",
    equipment: vehicle.equipment && vehicle.equipment.length > 40 ? "Alto" : vehicle.equipment ? "Medio" : "Desconocido",
    risk:
      listingQuality.score < 40 ? "alto" : listingQuality.score < 60 ? "medio" : vehicle.accidents ? "medio" : "bajo",
    likes: listingQuality.criteria.filter((c) => c.present).slice(0, 4).map((c) => c.detail),
    concerns: listingQuality.missing.slice(0, 5),
    askSeller: [],
    inspectBeforeBuying: [],
    limitations: [
      "Este bloque legacy se mantiene por compatibilidad. Usa «Calidad del anuncio» y la checklist de inspección.",
    ],
  };
}

export async function analyzeVehicle(input: VehicleInput): Promise<AnalyzeResponse> {
  const timer = new AnalysisTimer();
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
        description: vehicle.description ?? detail.description?.slice(0, 2000),
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
  timer.mark("vehicle_input", vehicle.listingUrl ? "listing detail attempted" : "form only");

  const identity = validateVehicleConsistency(vehicle);
  timer.mark("identity_validation", `${identity.status} · safe=${identity.safeForTechnicalKnowledge}`);

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
  const comparables = search.listings.filter((listing) => !listing.isDemo && !listing.isCompetitor);
  timer.mark("market_search", `${comparables.length} comparables`);

  const market = valueOnMarket({
    vehicle,
    identity,
    listings: comparables,
    searchNotes: search.notes,
    searchUrl: search.notes.find((n) => n.startsWith("URL filtrada:"))?.replace("URL filtrada: ", ""),
  });
  timer.mark("market_valuation", market.status);

  const knowledge = buildTechnicalKnowledge(identity);
  timer.mark(
    "knowledge",
    `${knowledge.status} · A=${knowledge.modelSpecific.length} B=${knowledge.platformShared.length}`,
  );

  const listingQuality = assessListingQuality(vehicle, market);
  const missingData = detectMissingData(vehicle, identity, market);
  const buyVerdict = buildBuyVerdict({ identity, market, knowledge, listingQuality });
  const scores = buildScorecard({ vehicle, identity, market, knowledge, listingQuality });
  const sellerQuestions = buildSellerQuestions(identity, vehicle, knowledge);
  const inspection = buildInspectionChecklist(identity, vehicle, knowledge);

  const reliability = knowledgeToReliability(knowledge);
  const maintenance = knowledgeToMaintenance(knowledge);
  const valuation = marketToLegacyValuation(market);
  const listingAnalysis = legacyListingAnalysis(vehicle, market, listingQuality);

  const hasKnowledge =
    knowledge.status !== "blocked" &&
    (knowledge.modelSpecific.length > 0 ||
      knowledge.platformShared.length > 0 ||
      knowledge.maintenance.available);
  const dataMode = resolveDataMode({
    hasLiveListings: comparables.length > 0,
    hasKnowledge,
  });

  const limitations: string[] = [
    ...market.limitations,
    ...knowledge.notes,
    ...identity.issues.map((issue) => issue.message),
  ];

  if (market.status === "unavailable") {
    limitations.push(
      "No se obtuvieron anuncios comparables de coches.net. No mostramos precio de mercado inventado.",
    );
  } else if (market.status === "insufficient") {
    limitations.push(
      `Solo hay ${market.comparableCount} anuncio(s) equivalente(s). No emitimos veredicto de precio fiable.`,
    );
  }

  if (market.segmentReference) {
    limitations.push(market.segmentReference.disclaimer);
  }

  if (knowledge.segmentContext.length > 0) {
    limitations.push(
      "Los puntos de «contexto de segmento» no son averías confirmadas de este modelo.",
    );
  }

  if (search.notes.length > 0 && comparables.length === 0) {
    limitations.push(...search.notes.slice(0, 2));
  }

  limitations.push(
    "El conocimiento técnico procede de una base curada (foros, manuales, recalls). No sustituye inspección mecánica ni informe de bastidor.",
  );

  const analysis: AnalyzeResponse = {
    id,
    generatedAt: new Date().toISOString(),
    dataMode,
    vehicle: { ...vehicle, id },
    identity,
    buyVerdict,
    market,
    knowledge,
    valuation,
    scores,
    listingQuality,
    missingData,
    inspection,
    comparables: comparables
      .slice()
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, 24),
    alternatives: [],
    sources: toSourceCitations(comparables, search),
    searchNotes: search.notes,
    listingDetailNotes: listingDetailNotes.length > 0 ? listingDetailNotes : undefined,
    listingAnalysis,
    sellerQuestions: sellerQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      why: q.reason,
      priority: q.priority,
      category: q.category,
      evidenceLevel: q.evidenceLevel,
    })),
    reliability,
    maintenance,
    limitations: Array.from(new Set(limitations)),
  };

  timer.finish({
    knowledge: {
      totalChunks: knowledge.coverage.totalChunks,
      applicable: knowledge.coverage.applicable,
      excluded: knowledge.coverage.excluded,
      byLevel: knowledge.coverage.byLevel,
    },
    market: {
      rawListings: search.listings.length,
      usedListings: comparables.length,
      providersQueried: search.connected ? 1 : 0,
      providersConnected: comparables.length > 0 ? 1 : 0,
    },
  });

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
    identity: analysis.identity,
    market: analysis.market,
    knowledge: analysis.knowledge,
  };
}
