import type { VehicleListing } from "@/types/listing";
import type {
  MatchStrictness,
  PriceAdjustment,
  PriceDistribution,
  PriceVerdict,
  ValuationResult,
} from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { estimateMarketAnchor } from "@/lib/sources/demo-listings";
import { average, clamp, percentile, roundTo, trimPriceOutliers, weightedMedian } from "@/lib/utils/math";

const VERDICT_LABELS: Record<PriceVerdict, string> = {
  muy_barato: "Muy barato",
  barato: "Buen precio",
  precio_de_mercado: "Precio de mercado",
  caro: "Caro",
  muy_caro: "Muy caro",
  sin_precio: "Sin precio anunciado",
};

function emptyDistribution(estimated: number): PriceDistribution {
  return {
    count: 0,
    min: estimated,
    p25: estimated,
    median: estimated,
    p75: estimated,
    max: estimated,
  };
}

function distributionFrom(prices: number[]): PriceDistribution {
  const sorted = [...prices].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    p25: roundTo(percentile(sorted, 0.25), 50),
    median: roundTo(percentile(sorted, 0.5), 50),
    p75: roundTo(percentile(sorted, 0.75), 50),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function verdictFromDelta(delta: number): PriceVerdict {
  if (delta <= -0.12) return "muy_barato";
  if (delta <= -0.04) return "barato";
  if (delta <= 0.04) return "precio_de_mercado";
  if (delta <= 0.12) return "caro";
  return "muy_caro";
}

function readMatchStrictness(listings: VehicleListing[]): MatchStrictness {
  const raw = listings[0]?.rawData?.matchStrictness;
  if (raw === "relaxed" || raw === "broad" || raw === "strict") return raw;
  return "strict";
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

  if (vehicle.maintenanceHistory && /completo|oficial|facturas/i.test(vehicle.maintenanceHistory)) {
    adjustments.push({
      label: "Historial de mantenimiento",
      amount: 300,
      reason: "El historial descrito sugiere mantenimiento documentado.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.accidents && /si|golpe|siniestro|repar/i.test(vehicle.accidents)) {
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
      reason: "Se ha descrito un equipamiento amplio. El ajuste es aproximado hasta tener una lista normalizada.",
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

  if (rawPrices.length < 5) {
    limitations.push("Hay pocos comparables. El intervalo de precio es orientativo y de baja confianza.");
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

  const distribution = distributionFrom(workingListings.map((listing) => listing.price as number));
  const comparableMileage = average(
    workingListings
      .map((listing) => listing.mileage)
      .filter((value): value is number => typeof value === "number"),
  );
  const comparableYear = average(
    workingListings.map((listing) => listing.year).filter((value): value is number => typeof value === "number"),
  );
  const adjustments = buildAdjustments(vehicle, { comparableMileage, comparableYear });

  // Mediana ponderada por similarity: los anuncios más parecidos pesan más.
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
  const percentDifference =
    advertisedPrice && estimated ? (advertisedPrice - estimated) / estimated : undefined;
  const verdict = percentDifference == null ? "sin_precio" : verdictFromDelta(percentDifference);

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
    26 + workingListings.length * 2.4 + completeness * 12 + avgSimilarity * 26;
  if (matchStrictness === "relaxed") confidence -= 8;
  if (matchStrictness === "broad") confidence -= 14;
  if (workingListings.length < 5) confidence -= 12;
  if (workingListings.length < 8) confidence -= 4;
  if (iqrRatio > 0.25) confidence -= 6;
  if (avgSimilarity < 0.7) confidence -= 10;
  if (outliersRemoved > 0) confidence += 2; // muestra más limpia
  if (scrapedEquipment) confidence += 3;
  confidence = Math.round(clamp(confidence, 22, 90));

  confidenceDrivers.push(`${workingListings.length} anuncios tras limpieza`);
  confidenceDrivers.push(`Similitud media ${(avgSimilarity * 100).toFixed(0)} %`);
  confidenceDrivers.push(
    matchStrictness === "strict"
      ? "Filtros estrechos"
      : matchStrictness === "relaxed"
        ? "Filtros relajados"
        : "Filtros amplios",
  );
  confidenceDrivers.push("Mediana ponderada por similitud");
  if (outliersRemoved > 0) {
    confidenceDrivers.push(`${outliersRemoved} outlier(s) excluidos`);
  }
  if (scrapedEquipment) {
    confidenceDrivers.push("Equipamiento scrapeado en comparables");
  }
  if (iqr > 0) confidenceDrivers.push(`Dispersión P25–P75: ${iqr.toLocaleString("es-ES")} €`);

  const sourceCount = new Set(workingListings.map((listing) => listing.source)).size;
  const summary =
    percentDifference == null
      ? "No hay precio anunciado, así que solo se estima el intervalo de mercado a partir de comparables."
      : percentDifference < 0
        ? `Está aproximadamente un ${Math.abs(percentDifference * 100).toFixed(1).replace(".", ",")} % por debajo del valor estimado de mercado.`
        : percentDifference > 0
          ? `Está aproximadamente un ${(percentDifference * 100).toFixed(1).replace(".", ",")} % por encima del valor estimado de mercado.`
          : "Coincide con el valor estimado de mercado.";

  if (!vehicle.power) {
    limitations.push("No se ha indicado la potencia. No se ajusta el precio por motor.");
  }
  if (!vehicle.transmission) {
    limitations.push("No se ha indicado el tipo de cambio. Los comparables pueden no ser homogéneos.");
  }

  return {
    estimatedPrice: estimated,
    advertisedPrice,
    low,
    high,
    percentDifference,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    summary,
    confidence,
    confidenceDrivers,
    avgSimilarity,
    matchStrictness,
    distribution,
    adjustments,
    comparableCount: workingListings.length,
    sourceCount,
    dataUpdatedAt: workingListings[0]?.fetchedAt ?? new Date().toISOString(),
    origin: "observed",
    methodology: [
      "Se buscan anuncios comparables del mismo modelo, año próximo y combustible (ampliando páginas si hace falta).",
      "Se filtran por similitud, versión, potencia y km; se excluyen precios atípicos (IQR).",
      "El valor base es la mediana ponderada por similitud de esos comparables.",
      "La confianza combina tamaño de muestra limpia, similitud media, dispersión y lo estrechos que fueron los filtros.",
      "Se aplican ajustes cuantitativos solo cuando el usuario ha aportado el dato (km, año, estado, historial, etc.).",
    ],
    limitations,
  };
}

function valueFromHeuristic(vehicle: Vehicle): ValuationResult {
  const limitations: string[] = [
    "Sin anuncios reales de mercado no hay mediana observada. El valor es solo una referencia de segmento.",
  ];

  let estimated = estimateMarketAnchor(vehicle);
  const adjustments = buildAdjustments(vehicle, {});
  for (const adjustment of adjustments) {
    estimated += adjustment.amount;
  }
  estimated = roundTo(clamp(estimated, 2500, 180000), 50);

  const spread = Math.max(2000, roundTo(estimated * 0.14, 50));
  const low = roundTo(estimated - spread, 50);
  const high = roundTo(estimated + spread, 50);

  const advertisedPrice = vehicle.advertisedPrice;
  const percentDifference =
    advertisedPrice && estimated ? (advertisedPrice - estimated) / estimated : undefined;

  // Sin mercado: no hay semáforo barato/caro fiable.
  const verdict: PriceVerdict = "sin_precio";
  const verdictLabel = advertisedPrice
    ? "Solo referencia (sin mercado)"
    : VERDICT_LABELS.sin_precio;

  const completeness =
    [
      vehicle.power,
      vehicle.transmission,
      vehicle.generalCondition,
      vehicle.equipment,
      vehicle.accidents,
      vehicle.itv,
    ].filter(Boolean).length / 6;

  const confidence = Math.round(clamp(14 + completeness * 10, 12, 32));
  const confidenceDrivers = [
    "Sin anuncios observados",
    "Referencia de segmento por marca/modelo/año/km",
    `Completitud del formulario ${(completeness * 100).toFixed(0)} %`,
  ];

  const summary =
    percentDifference == null
      ? "No hay precio anunciado ni anuncios reales conectados. Solo se muestra una referencia orientativa de segmento."
      : `Frente a una referencia orientativa (no mediana de anuncios), el anuncio quedaría ~${Math.abs(percentDifference * 100).toFixed(1).replace(".", ",")} % ${percentDifference < 0 ? "por debajo" : "por encima"}. Confirma en coches.net antes de decidir.`;

  if (!vehicle.power) {
    limitations.push("No se ha indicado la potencia. La referencia no ajusta por motor concreto.");
  }
  if (!vehicle.transmission) {
    limitations.push("No se ha indicado el tipo de cambio. La referencia usa valores medios del segmento.");
  }

  return {
    estimatedPrice: estimated,
    advertisedPrice,
    low,
    high,
    percentDifference,
    verdict,
    verdictLabel,
    summary,
    confidence,
    confidenceDrivers,
    distribution: emptyDistribution(estimated),
    adjustments,
    comparableCount: 0,
    sourceCount: 0,
    dataUpdatedAt: new Date().toISOString(),
    origin: "ai_estimate",
    methodology: [
      "Sin anuncios conectados, se usa una referencia de mercado por marca, modelo, antigüedad y kilometraje.",
      "No se emite veredicto barato/caro: no hay mediana real que lo sustente.",
      "Se aplican ajustes solo con datos que has introducido (estado, historial, equipamiento, etc.).",
      "El intervalo es amplio a propósito: no simula percentiles de anuncios que no existen.",
    ],
    limitations,
  };
}

export function valueVehicle(vehicle: Vehicle, listings: VehicleListing[]): ValuationResult {
  const observed = listings.filter(
    (listing) => !listing.isDemo && typeof listing.price === "number" && listing.price > 0,
  );
  if (observed.length > 0) {
    return valueFromObservedListings(vehicle, observed);
  }
  return valueFromHeuristic(vehicle);
}
