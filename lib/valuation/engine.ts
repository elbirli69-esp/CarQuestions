import type { VehicleListing } from "@/types/listing";
import type {
  ConfidenceBand,
  MatchStrictness,
  PriceAdjustment,
  PriceDistribution,
  PriceVerdict,
  ValuationResult,
} from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { estimateMarketAnchor } from "@/lib/sources/demo-listings";
import { average, clamp, percentile, roundTo, trimPriceOutliers, weightedMedian } from "@/lib/utils/math";

/** Minimum verified listings required for an "observed market" verdict. */
export const MIN_OBSERVED_FOR_VERDICT = 5;
/** Minimum to show any observed estimate (very low confidence). */
export const MIN_OBSERVED_FOR_ESTIMATE = 3;

const VERDICT_LABELS: Record<PriceVerdict, string> = {
  muy_barato: "Muy barato",
  barato: "Buen precio",
  precio_de_mercado: "Precio de mercado",
  caro: "Caro",
  muy_caro: "Muy caro",
  sin_precio: "Sin precio anunciado",
};

function emptyDistribution(): PriceDistribution {
  return {
    count: 0,
    min: 0,
    p25: 0,
    median: 0,
    p75: 0,
    max: 0,
  };
}

function distributionFrom(prices: number[], listings: VehicleListing[]): PriceDistribution {
  const sorted = [...prices].sort((a, b) => a - b);
  const mileages = listings
    .map((l) => l.mileage)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const avgKm = average(mileages);
  const avgPrice = average(sorted);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    p10: roundTo(percentile(sorted, 0.1), 50),
    p25: roundTo(percentile(sorted, 0.25), 50),
    median: roundTo(percentile(sorted, 0.5), 50),
    p75: roundTo(percentile(sorted, 0.75), 50),
    p90: roundTo(percentile(sorted, 0.9), 50),
    max: sorted[sorted.length - 1] ?? 0,
    eurPerKm:
      avgKm && avgPrice && avgKm > 0 ? Math.round((avgPrice / avgKm) * 100) / 100 : undefined,
  };
}

function verdictFromDelta(delta: number): PriceVerdict {
  if (delta <= -0.12) return "muy_barato";
  if (delta <= -0.04) return "barato";
  if (delta <= 0.04) return "precio_de_mercado";
  if (delta <= 0.12) return "caro";
  return "muy_caro";
}

function bandFromConfidence(confidence: number, origin: ValuationResult["origin"], count: number): ConfidenceBand {
  if (origin !== "observed" || count < MIN_OBSERVED_FOR_ESTIMATE) return "muy_baja";
  if (count < MIN_OBSERVED_FOR_VERDICT) return "baja";
  if (confidence >= 70) return "alta";
  if (confidence >= 50) return "media";
  if (confidence >= 30) return "baja";
  return "muy_baja";
}

function readMatchStrictness(listings: VehicleListing[]): MatchStrictness {
  const raw = listings[0]?.rawData?.matchStrictness;
  if (raw === "relaxed" || raw === "broad" || raw === "strict") return raw;
  return "strict";
}

/** Detect positive accident declarations; ignore negations like "sin accidentes". */
export function indicatesAccident(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^(no|ningun|ninguno|sin|n\/a|na|-)\b/.test(t)) return false;
  if (/\b(sin|no\s+ha|no\s+tiene|ningun)\b.{0,20}\b(accident|golpe|siniestro)/i.test(t)) return false;
  return /\b(accident|golpe|siniestro|reparaci[oó]n\s+de\s+chapa|chocado)\b/i.test(t);
}

function conditionAdjustment(vehicle: Vehicle): PriceAdjustment | null {
  const condition = vehicle.generalCondition;
  if (!condition || condition === "unknown") return null;
  const amount =
    condition === "excellent" ? 600 : condition === "good" ? 250 : condition === "fair" ? -400 : -900;
  return {
    label: "Estado general",
    amount,
    reason: `Ajuste por estado declarado: ${condition}.`,
    origin: "observed",
    applied: true,
  };
}

function buildAdjustments(
  vehicle: Vehicle,
  options: { comparableMileage?: number | null; comparableYear?: number | null },
): PriceAdjustment[] {
  const adjustments: PriceAdjustment[] = [];
  const { comparableMileage, comparableYear } = options;

  if (comparableMileage != null) {
    const amount = roundTo((comparableMileage - vehicle.mileage) * 0.05, 10);
    if (Math.abs(amount) >= 50) {
      adjustments.push({
        label: "Kilometraje",
        amount,
        reason:
          amount < 0
            ? "Este coche tiene más kilómetros que la media de los comparables."
            : "Este coche tiene menos kilómetros que la media de los comparables.",
        origin: "observed",
        applied: true,
      });
    }
  }

  if (comparableYear != null) {
    const amount = roundTo((vehicle.year - comparableYear) * 550, 10);
    if (Math.abs(amount) >= 50) {
      adjustments.push({
        label: "Antigüedad",
        amount,
        reason:
          amount < 0
            ? "Es algo más antiguo que la media de los anuncios comparables."
            : "Es algo más reciente que la media de los anuncios comparables.",
        origin: "observed",
        applied: true,
      });
    }
  }

  const condition = conditionAdjustment(vehicle);
  if (condition) adjustments.push(condition);

  if (vehicle.serviceBook) {
    adjustments.push({
      label: "Libro de mantenimiento",
      amount: 300,
      reason: "El usuario indica que existe libro de mantenimiento.",
      origin: "observed",
      applied: true,
    });
  }

  if (
    vehicle.maintenanceHistory &&
    /\b(completo|oficial|facturas)\b/i.test(vehicle.maintenanceHistory) &&
    !/\b(no|sin)\b.{0,15}\b(completo|oficial|facturas)\b/i.test(vehicle.maintenanceHistory)
  ) {
    adjustments.push({
      label: "Historial de mantenimiento",
      amount: 300,
      reason: "El historial descrito sugiere mantenimiento documentado.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.accidents && indicatesAccident(vehicle.accidents)) {
    adjustments.push({
      label: "Accidentes",
      amount: -700,
      reason: "El usuario ha indicado un posible accidente o reparación. Hay que contrastarlo; no se asume la gravedad.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.equipment && vehicle.equipment.length > 40) {
    adjustments.push({
      label: "Equipamiento",
      amount: 450,
      reason: "Se ha descrito un equipamiento amplio. El ajuste es aproximativo hasta normalizar la lista.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.owners && vehicle.owners >= 3) {
    adjustments.push({
      label: "Número de propietarios",
      amount: -250,
      reason: `Consta de ${vehicle.owners} propietarios, por encima de lo habitual en este tipo de anuncio.`,
      origin: "observed",
      applied: true,
    });
  }

  return adjustments;
}

function valueFromObservedListings(vehicle: Vehicle, listings: VehicleListing[]): ValuationResult {
  const priced = listings.filter((listing) => typeof listing.price === "number" && listing.price > 0);
  const rawPrices = priced.map((listing) => listing.price as number);
  const limitations: string[] = [];
  const confidenceDrivers: string[] = [];
  const matchStrictness = readMatchStrictness(priced);

  if (rawPrices.length < MIN_OBSERVED_FOR_VERDICT) {
    limitations.push(
      `Solo hay ${rawPrices.length} comparable(s). Se necesita ≥${MIN_OBSERVED_FOR_VERDICT} para un veredicto de precio fiable.`,
    );
  }
  if (matchStrictness === "relaxed") {
    limitations.push("Los filtros de comparables se relajaron (p. ej. combustible) para reunir suficientes anuncios.");
  }
  if (matchStrictness === "broad") {
    limitations.push("Los filtros de comparables son amplios: la mediana puede mezclar años o versiones distintas.");
  }

  const { kept: trimmedPrices, removed: outliersRemoved } = trimPriceOutliers(rawPrices);
  const trimmedPriceSet = new Set(trimmedPrices);
  const workingListings =
    outliersRemoved > 0
      ? priced.filter((listing) => trimmedPriceSet.has(listing.price as number))
      : priced;

  if (outliersRemoved > 0) {
    limitations.push(
      `Se excluyeron ${outliersRemoved} precio(s) atípico(s) antes de calcular la mediana (vallas IQR).`,
    );
  }

  const distribution = distributionFrom(
    workingListings.map((listing) => listing.price as number),
    workingListings,
  );
  const comparableMileage = average(
    workingListings
      .map((listing) => listing.mileage)
      .filter((value): value is number => typeof value === "number"),
  );
  const comparableYear = average(
    workingListings.map((listing) => listing.year).filter((value): value is number => typeof value === "number"),
  );
  const adjustments = buildAdjustments(vehicle, { comparableMileage, comparableYear });

  const weighted = weightedMedian(
    workingListings.map((listing) => ({
      value: listing.price as number,
      weight: Math.max(0.15, listing.similarity ?? 0.6),
    })),
  );
  let estimated = roundTo(weighted || distribution.median || 0, 50);
  for (const adjustment of adjustments) {
    estimated += adjustment.amount;
  }

  estimated = roundTo(
    clamp(estimated, distribution.min || estimated, distribution.max || estimated + 4000),
    50,
  );

  const iqr = Math.max(0, distribution.p75 - distribution.p25);
  const iqrRatio = estimated > 0 ? iqr / estimated : 0;
  const avgSimilarity =
    average(
      workingListings
        .map((listing) => listing.similarity)
        .filter((value): value is number => typeof value === "number"),
    ) ?? 0.7;

  let spreadPct = 0.045;
  if (workingListings.length < 5) spreadPct = 0.12;
  else if (workingListings.length < 8 || matchStrictness !== "strict") spreadPct = 0.08;
  else if (iqrRatio > 0.2) spreadPct = 0.07;

  const spreadFromIqr = workingListings.length >= 5 ? roundTo(iqr * 0.55, 50) : 0;
  const spreadFromPct = Math.max(800, roundTo(estimated * spreadPct, 50));
  const spread = Math.max(spreadFromPct, spreadFromIqr);
  const low = roundTo(estimated - spread, 50);
  const high = roundTo(estimated + spread, 50);

  const advertisedPrice = vehicle.advertisedPrice;
  const allowVerdict = workingListings.length >= MIN_OBSERVED_FOR_VERDICT;
  const percentDifference =
    allowVerdict && advertisedPrice && estimated
      ? (advertisedPrice - estimated) / estimated
      : undefined;
  const verdict =
    percentDifference == null
      ? advertisedPrice
        ? "sin_precio"
        : "sin_precio"
      : verdictFromDelta(percentDifference);

  const completeness =
    [
      vehicle.power,
      vehicle.transmission,
      vehicle.generalCondition,
      vehicle.equipment,
      vehicle.accidents,
      vehicle.itv,
    ].filter(Boolean).length / 6;

  const scrapedEquipment = workingListings.some(
    (l) => (l.equipment?.length ?? 0) > 0 || l.rawData?.detailScraped === true,
  );

  let confidence =
    18 + workingListings.length * 2.2 + completeness * 8 + avgSimilarity * 22;
  if (matchStrictness === "relaxed") confidence -= 8;
  if (matchStrictness === "broad") confidence -= 14;
  if (workingListings.length < 5) confidence -= 18;
  if (workingListings.length < 3) confidence -= 10;
  if (workingListings.length < 8) confidence -= 4;
  if (iqrRatio > 0.25) confidence -= 6;
  if (avgSimilarity < 0.7) confidence -= 10;
  if (outliersRemoved > 0) confidence += 2;
  if (scrapedEquipment) confidence += 3;
  // Cap: never claim high precision with tiny samples
  const maxConf =
    workingListings.length >= 12 ? 88 : workingListings.length >= 5 ? 78 : workingListings.length >= 3 ? 42 : 28;
  confidence = Math.round(clamp(confidence, 12, maxConf));

  confidenceDrivers.push(`${workingListings.length} anuncios tras limpieza`);
  confidenceDrivers.push(`Similitud media ${(avgSimilarity * 100).toFixed(0)} %`);
  confidenceDrivers.push(
    matchStrictness === "strict"
      ? "Filtros estrechos"
      : matchStrictness === "relaxed"
        ? "Filtros relajados"
        : "Filtros amplios",
  );
  if (!allowVerdict) {
    confidenceDrivers.push("Muestra insuficiente para veredicto barato/caro");
  }

  const sourceCount = new Set(workingListings.map((listing) => listing.source)).size;
  let summary: string;
  if (!allowVerdict) {
    summary = advertisedPrice
      ? `Hay ${workingListings.length} comparable(s), insuficiente para afirmar si ${advertisedPrice.toLocaleString("es-ES")} € es caro o barato.`
      : `Hay ${workingListings.length} comparable(s). La estimación es orientativa y de baja confianza.`;
  } else if (percentDifference == null) {
    summary = "No hay precio anunciado; se muestra el intervalo de mercado a partir de comparables.";
  } else if (percentDifference < 0) {
    summary = `Está aproximadamente un ${Math.abs(percentDifference * 100).toFixed(1).replace(".", ",")} % por debajo del valor estimado de mercado.`;
  } else if (percentDifference > 0) {
    summary = `Está aproximadamente un ${(percentDifference * 100).toFixed(1).replace(".", ",")} % por encima del valor estimado de mercado.`;
  } else {
    summary = "Coincide con el valor estimado de mercado.";
  }

  if (!vehicle.power) {
    limitations.push("No se ha indicado la potencia. No se ajusta el precio por motor.");
  }
  if (!vehicle.transmission) {
    limitations.push("No se ha indicado el tipo de cambio. Los comparables pueden no ser homogéneos.");
  }

  const confidenceBand = bandFromConfidence(confidence, "observed", workingListings.length);

  return {
    estimatedPrice: estimated,
    advertisedPrice,
    low,
    high,
    percentDifference,
    verdict: allowVerdict ? verdict : "sin_precio",
    verdictLabel: allowVerdict
      ? VERDICT_LABELS[verdict]
      : advertisedPrice
        ? "Sin veredicto (pocos comparables)"
        : VERDICT_LABELS.sin_precio,
    summary,
    confidence,
    confidenceBand,
    confidenceDrivers,
    avgSimilarity,
    matchStrictness,
    distribution,
    adjustments,
    comparableCount: workingListings.length,
    sourceCount,
    dataUpdatedAt: workingListings[0]?.fetchedAt ?? new Date().toISOString(),
    origin: "observed",
    insufficientMarketData: !allowVerdict,
    methodology: [
      "Se buscan anuncios comparables del mismo modelo, año próximo y combustible.",
      "Se filtran por similitud, versión, potencia y km; se excluyen precios atípicos (IQR).",
      `Se emite veredicto barato/caro solo con ≥${MIN_OBSERVED_FOR_VERDICT} comparables verificados.`,
      "El valor base es la mediana ponderada por similitud.",
      "La confianza se limita según el tamaño de muestra: no hay precisión falsa con 1–2 anuncios.",
    ],
    limitations,
  };
}

function valueWithoutMarket(vehicle: Vehicle): ValuationResult {
  const limitations: string[] = [
    "Sin suficientes anuncios comparables reales. No se inventa un precio de mercado.",
  ];

  const advertisedPrice = vehicle.advertisedPrice;
  const anchor = estimateMarketAnchor(vehicle);
  const completeness =
    [
      vehicle.power,
      vehicle.transmission,
      vehicle.generalCondition,
      vehicle.equipment,
      vehicle.accidents,
      vehicle.itv,
    ].filter(Boolean).length / 6;

  const confidence = Math.round(clamp(10 + completeness * 6, 8, 22));
  const confidenceBand = bandFromConfidence(confidence, "demo_model", 0);

  return {
    estimatedPrice: null,
    advertisedPrice,
    low: null,
    high: null,
    percentDifference: undefined,
    verdict: "sin_precio",
    verdictLabel: "Sin mercado comparable",
    summary: advertisedPrice
      ? `Precio anunciado ${advertisedPrice.toLocaleString("es-ES")} €, pero no hay anuncios comparables suficientes para contrastarlo.`
      : "No hay anuncios comparables ni precio anunciado. Completa el anuncio o reintenta más tarde.",
    confidence,
    confidenceBand,
    confidenceDrivers: [
      "Sin anuncios observados",
      "No se publica mediana inventada",
      `Completitud del formulario ${(completeness * 100).toFixed(0)} %`,
    ],
    distribution: emptyDistribution(),
    adjustments: [],
    comparableCount: 0,
    sourceCount: 0,
    dataUpdatedAt: new Date().toISOString(),
    origin: "demo_model",
    insufficientMarketData: true,
    segmentReference: {
      amount: roundTo(anchor, 50),
      label: "Referencia orientativa de segmento",
      disclaimer:
        "Ancla heurística por marca/modelo/año/km. NO es mediana de anuncios. No uses este número para negociar como si fuera mercado observado.",
    },
    methodology: [
      "Sin anuncios conectados no se calcula mediana de mercado.",
      "Se puede mostrar una referencia de segmento claramente separada y etiquetada como no observada.",
      "No se emite veredicto barato/caro.",
    ],
    limitations,
  };
}

export function valueVehicle(vehicle: Vehicle, listings: VehicleListing[]): ValuationResult {
  const observed = listings.filter(
    (listing) => !listing.isDemo && typeof listing.price === "number" && listing.price > 0,
  );
  if (observed.length >= MIN_OBSERVED_FOR_ESTIMATE) {
    return valueFromObservedListings(vehicle, observed);
  }
  if (observed.length > 0) {
    // 1–2 listings: still insufficient — fold into no-market with a note
    const base = valueWithoutMarket(vehicle);
    return {
      ...base,
      comparableCount: observed.length,
      sourceCount: new Set(observed.map((l) => l.source)).size,
      origin: "observed",
      confidence: Math.round(clamp(12 + observed.length * 4, 10, 24)),
      confidenceBand: "muy_baja",
      summary: `Solo ${observed.length} anuncio(s) comparable(s). Confianza muy baja: no se publica un precio de mercado preciso.`,
      limitations: [
        ...base.limitations,
        `Se encontraron ${observed.length} anuncio(s), por debajo del mínimo de ${MIN_OBSERVED_FOR_ESTIMATE} para estimar.`,
      ],
      confidenceDrivers: [
        `${observed.length} anuncio(s) únicamente`,
        "Muestra insuficiente",
        "Sin mediana publicada",
      ],
    };
  }
  return valueWithoutMarket(vehicle);
}
