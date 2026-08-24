import type { VehicleListing } from "@/types/listing";
import type {
  ComparabilityBreakdown,
  MarketStatus,
  MarketValuation,
  PriceAdjustment,
  PriceDistribution,
  PriceVerdict,
  SegmentReference,
} from "@/types/market";
import type { VehicleIdentity } from "@/types/identity";
import type { Vehicle } from "@/types/vehicle";
import { average, clamp, percentile, roundTo, trimPriceOutliers, weightedMedian } from "@/lib/utils/math";
import { assessConfidence, roundingStepFor } from "@/lib/valuation/confidence";
import { segmentReferenceFor } from "@/lib/valuation/segment-reference";

const VERDICT_LABELS: Record<PriceVerdict, string> = {
  muy_barato: "Muy por debajo del mercado",
  barato: "Por debajo del mercado",
  precio_de_mercado: "En precio de mercado",
  caro: "Por encima del mercado",
  muy_caro: "Muy por encima del mercado",
  sin_precio: "Sin precio anunciado",
  sin_mercado: "Sin mercado comparable",
};

/** Mínimo de anuncios para hablar de "mercado" y no de anécdota. */
const MIN_LISTINGS_FOR_MARKET = 3;
/** Mínimo para que los percentiles signifiquen algo. */
const MIN_LISTINGS_FOR_DISTRIBUTION = 5;

function distributionFrom(prices: number[], mileages: number[]): PriceDistribution {
  const sorted = [...prices].sort((a, b) => a - b);
  const p25 = percentile(sorted, 0.25);
  const p75 = percentile(sorted, 0.75);
  const medianMileage = median(mileages);
  const medianPrice = percentile(sorted, 0.5);

  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    p10: roundTo(percentile(sorted, 0.1), 50),
    p25: roundTo(p25, 50),
    median: roundTo(medianPrice, 50),
    p75: roundTo(p75, 50),
    p90: roundTo(percentile(sorted, 0.9), 50),
    max: sorted[sorted.length - 1] ?? 0,
    iqr: Math.max(0, roundTo(p75 - p25, 50)),
    medianPricePerKm:
      medianMileage && medianMileage > 0
        ? Number((medianPrice / medianMileage).toFixed(3))
        : null,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  return percentile([...values].sort((a, b) => a - b), 0.5);
}

function verdictFromDelta(delta: number): PriceVerdict {
  if (delta <= -0.12) return "muy_barato";
  if (delta <= -0.04) return "barato";
  if (delta <= 0.04) return "precio_de_mercado";
  if (delta <= 0.12) return "caro";
  return "muy_caro";
}

function readMatchStrictness(listings: VehicleListing[]): "strict" | "relaxed" | "broad" | null {
  const raw = listings[0]?.rawData?.matchStrictness;
  if (raw === "relaxed" || raw === "broad" || raw === "strict") return raw;
  return null;
}

/** Fracción de campos que el usuario ha aportado y afectan a la comparación. */
export function dataCompleteness(vehicle: Vehicle): number {
  const fields = [
    vehicle.version,
    vehicle.power,
    vehicle.transmission,
    vehicle.generalCondition,
    vehicle.equipment,
    vehicle.maintenanceHistory,
    vehicle.accidents,
    vehicle.itv,
  ];
  return fields.filter((value) => value !== undefined && value !== "").length / fields.length;
}

function buildComparability(
  vehicle: Vehicle,
  listings: VehicleListing[],
): ComparabilityBreakdown {
  const near = (a: number | undefined, b: number | undefined, tolerance: number): boolean =>
    a != null && b != null && Math.abs(a - b) <= tolerance;

  return {
    total: listings.length,
    sameFuel: listings.filter((item) => item.fuel && item.fuel === vehicle.fuel).length,
    sameTransmission: vehicle.transmission
      ? listings.filter((item) => item.transmission === vehicle.transmission).length
      : 0,
    similarPower: vehicle.power
      ? listings.filter((item) =>
          near(item.power, vehicle.power!, Math.max(12, vehicle.power! * 0.15)),
        ).length
      : 0,
    closeYear: listings.filter((item) => near(item.year, vehicle.year, 1)).length,
    closeMileage: listings.filter((item) =>
      near(item.mileage, vehicle.mileage, Math.max(15000, vehicle.mileage * 0.25)),
    ).length,
    averageSimilarity:
      average(
        listings
          .map((item) => item.similarity)
          .filter((value): value is number => typeof value === "number"),
      ) ?? 0.6,
  };
}

/**
 * Ajustes cuantitativos. Solo se aplican sobre datos que el usuario ha
 * declarado o que se han observado en los comparables: nunca se inventan.
 */
function buildAdjustments(
  vehicle: Vehicle,
  options: { comparableMileage?: number | null; comparableYear?: number | null },
): PriceAdjustment[] {
  const adjustments: PriceAdjustment[] = [];
  const { comparableMileage, comparableYear } = options;

  if (comparableMileage != null) {
    const amount = roundTo((comparableMileage - vehicle.mileage) * 0.05, 10);
    if (Math.abs(amount) >= 100) {
      adjustments.push({
        label: "Kilometraje",
        amount,
        reason:
          amount < 0
            ? `Tiene ${Math.round(vehicle.mileage - comparableMileage).toLocaleString("es-ES")} km más que la media de los comparables.`
            : `Tiene ${Math.round(comparableMileage - vehicle.mileage).toLocaleString("es-ES")} km menos que la media de los comparables.`,
        origin: "observed_market",
      });
    }
  }

  if (comparableYear != null) {
    const amount = roundTo((vehicle.year - comparableYear) * 550, 10);
    if (Math.abs(amount) >= 150) {
      adjustments.push({
        label: "Antigüedad",
        amount,
        reason:
          amount < 0
            ? "Es más antiguo que la media de los anuncios comparables."
            : "Es más reciente que la media de los anuncios comparables.",
        origin: "observed_market",
      });
    }
  }

  const condition = vehicle.generalCondition;
  if (condition && condition !== "unknown") {
    const amount =
      condition === "excellent" ? 600 : condition === "good" ? 250 : condition === "fair" ? -400 : -900;
    adjustments.push({
      label: "Estado general",
      amount,
      reason: `Ajuste por el estado que has declarado (${condition}). No lo hemos visto: contrástalo en persona.`,
      origin: "user_declared",
    });
  }

  if (vehicle.serviceBook) {
    adjustments.push({
      label: "Libro de mantenimiento",
      amount: 300,
      reason: "Has indicado que existe libro de mantenimiento.",
      origin: "user_declared",
    });
  }

  if (vehicle.maintenanceHistory && /completo|oficial|facturas/i.test(vehicle.maintenanceHistory)) {
    adjustments.push({
      label: "Historial documentado",
      amount: 300,
      reason: "El historial que describes sugiere mantenimiento con facturas.",
      origin: "user_declared",
    });
  }

  if (vehicle.accidents && /s[ií]|golpe|siniestro|repar/i.test(vehicle.accidents)) {
    adjustments.push({
      label: "Accidente declarado",
      amount: -700,
      reason:
        "Has indicado un posible accidente o reparación. El descuento es orientativo: la gravedad real cambia mucho el impacto.",
      origin: "user_declared",
    });
  }

  if (vehicle.owners && vehicle.owners >= 3) {
    adjustments.push({
      label: "Propietarios",
      amount: -250,
      reason: `Constan ${vehicle.owners} propietarios, por encima de lo habitual.`,
      origin: "user_declared",
    });
  }

  return adjustments;
}

function noMarketValuation(
  vehicle: Vehicle,
  status: MarketStatus,
  notes: string[],
  searchUrl?: string,
): MarketValuation {
  const reference: SegmentReference | null = segmentReferenceFor(vehicle);

  const limitations = [
    status === "unavailable"
      ? "No hemos encontrado ningún anuncio comparable, así que no hay precio de mercado que mostrar. No inventamos una cifra."
      : "Hay muy pocos anuncios comparables para calcular una mediana fiable.",
    ...notes.slice(0, 3),
  ];
  if (!reference) {
    limitations.push(
      "Tampoco tenemos una referencia de segmento para este modelo, así que preferimos no dar ningún número.",
    );
  }

  return {
    status,
    estimatedPrice: null,
    range: null,
    distribution: null,
    advertisedPrice: vehicle.advertisedPrice,
    verdict: "sin_mercado",
    verdictLabel: VERDICT_LABELS.sin_mercado,
    summary:
      status === "unavailable"
        ? "Sin anuncios comparables no podemos decir si el precio es bueno o malo. Busca tú mismo en el portal antes de decidir."
        : "Con tan pocos anuncios equivalentes cualquier mediana sería casualidad. Trátalo como que no hay mercado medible.",
    confidence: assessConfidence({
      comparableCount: 0,
      averageSimilarity: 0,
      matchStrictness: null,
      iqrRatio: 0,
      dataCompleteness: dataCompleteness(vehicle),
      identityWarnings: 0,
    }),
    adjustments: [],
    comparability: null,
    comparableCount: 0,
    sourceCount: 0,
    matchStrictness: null,
    dataUpdatedAt: new Date().toISOString(),
    methodology: [
      "Buscamos anuncios del mismo modelo, año próximo y combustible en coches.net (mercado España).",
      "Si no aparecen comparables, no calculamos precio: preferimos decir que no lo sabemos.",
      reference
        ? "La referencia de segmento es una tabla interna orientativa y se muestra aparte, nunca como precio de mercado."
        : "No mostramos referencia de segmento porque no tenemos ancla documentada para este modelo.",
    ],
    limitations,
    segmentReference: reference,
    marketSearchUrl: searchUrl,
  };
}

export interface MarketValuationInput {
  vehicle: Vehicle;
  identity: VehicleIdentity;
  listings: VehicleListing[];
  searchNotes: string[];
  searchUrl?: string;
}

/**
 * Valoración de mercado a partir de anuncios reales.
 *
 * Principio rector: si no hay mercado observable, no hay precio. La versión
 * anterior devolvía una cifra heurística con aspecto de tasación (y una
 * confianza del 14 %), lo que llevaba a leerla como valor de mercado.
 */
export function valueOnMarket(input: MarketValuationInput): MarketValuation {
  const { vehicle, identity, searchNotes, searchUrl } = input;

  const priced = input.listings.filter(
    (listing) => !listing.isDemo && typeof listing.price === "number" && listing.price > 0,
  );

  if (priced.length === 0) {
    return noMarketValuation(vehicle, "unavailable", searchNotes, searchUrl);
  }
  if (priced.length < MIN_LISTINGS_FOR_MARKET) {
    const partial = noMarketValuation(vehicle, "insufficient", searchNotes, searchUrl);
    return {
      ...partial,
      comparableCount: priced.length,
      sourceCount: new Set(priced.map((listing) => listing.source)).size,
      limitations: [
        `Solo hay ${priced.length} anuncio(s) equivalente(s). Es demasiado poco para hablar de precio de mercado.`,
        ...partial.limitations.slice(1),
      ],
    };
  }

  const limitations: string[] = [];
  const matchStrictness = readMatchStrictness(priced);
  const rawPrices = priced.map((listing) => listing.price as number);
  const { kept, removed } = trimPriceOutliers(rawPrices);
  const keptSet = new Set(kept);
  const working = removed > 0 ? priced.filter((listing) => keptSet.has(listing.price as number)) : priced;

  if (removed > 0) {
    limitations.push(`Se excluyeron ${removed} precio(s) atípico(s) antes de calcular la mediana (vallas IQR).`);
  }
  if (matchStrictness === "relaxed") {
    limitations.push("Los filtros de comparables se relajaron para reunir muestra suficiente.");
  }
  if (matchStrictness === "broad") {
    limitations.push("Los filtros son amplios: la mediana puede mezclar años o versiones distintas.");
  }

  const mileages = working
    .map((listing) => listing.mileage)
    .filter((value): value is number => typeof value === "number");
  const distribution = distributionFrom(
    working.map((listing) => listing.price as number),
    mileages,
  );

  const comparableMileage = average(mileages);
  const comparableYear = average(
    working.map((listing) => listing.year).filter((value): value is number => typeof value === "number"),
  );
  const adjustments = buildAdjustments(vehicle, { comparableMileage, comparableYear });
  const comparability = buildComparability(vehicle, working);

  const baseline = weightedMedian(
    working.map((listing) => ({
      value: listing.price as number,
      weight: Math.max(0.15, listing.similarity ?? 0.6),
    })),
  );

  let estimated = baseline || distribution.median;
  for (const adjustment of adjustments) estimated += adjustment.amount;
  estimated = clamp(estimated, distribution.min, distribution.max);

  const iqrRatio = estimated > 0 ? distribution.iqr / estimated : 0;
  const confidence = assessConfidence({
    comparableCount: working.length,
    averageSimilarity: comparability.averageSimilarity,
    matchStrictness,
    iqrRatio,
    dataCompleteness: dataCompleteness(vehicle),
    identityWarnings: identity.issues.filter((issue) => issue.severity === "warning").length,
  });

  const step = roundingStepFor(confidence.level);
  estimated = roundTo(estimated, step);

  // El intervalo nace de la dispersión real cuando la hay; si la muestra es
  // corta se ensancha a propósito en vez de fingir precisión.
  const spreadFromIqr =
    working.length >= MIN_LISTINGS_FOR_DISTRIBUTION ? distribution.iqr * 0.6 : 0;
  const spreadPct =
    confidence.level === "high" ? 0.045 : confidence.level === "medium" ? 0.07 : 0.12;
  const spread = Math.max(roundTo(estimated * spreadPct, step), roundTo(spreadFromIqr, step), step);
  const range = { low: roundTo(estimated - spread, step), high: roundTo(estimated + spread, step) };

  const advertisedPrice = vehicle.advertisedPrice;
  const percentDifference =
    advertisedPrice && estimated > 0 ? (advertisedPrice - estimated) / estimated : undefined;
  const verdict: PriceVerdict =
    percentDifference == null ? "sin_precio" : verdictFromDelta(percentDifference);

  if (working.length < MIN_LISTINGS_FOR_DISTRIBUTION) {
    limitations.push(
      `Con ${working.length} anuncios no mostramos percentiles: no serían representativos.`,
    );
  }
  if (!vehicle.power) {
    limitations.push("No has indicado la potencia, así que los comparables pueden mezclar motorizaciones.");
  }
  if (!vehicle.version) {
    limitations.push("Sin la versión exacta no podemos distinguir acabados, que mueven bastante el precio.");
  }

  const summary =
    percentDifference == null
      ? `La horquilla de mercado para un coche así está entre ${range.low.toLocaleString("es-ES")} y ${range.high.toLocaleString("es-ES")} €. Añade el precio del anuncio para compararlo.`
      : percentDifference < -0.005
        ? `Está un ${Math.abs(percentDifference * 100).toFixed(1).replace(".", ",")} % por debajo de lo que piden anuncios equivalentes.`
        : percentDifference > 0.005
          ? `Está un ${(percentDifference * 100).toFixed(1).replace(".", ",")} % por encima de lo que piden anuncios equivalentes.`
          : "Está prácticamente en la mediana de los anuncios equivalentes.";

  return {
    status: "observed",
    estimatedPrice: estimated,
    range,
    distribution: working.length >= MIN_LISTINGS_FOR_DISTRIBUTION ? distribution : null,
    advertisedPrice,
    percentDifference,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    summary,
    confidence,
    adjustments,
    comparability,
    comparableCount: working.length,
    sourceCount: new Set(working.map((listing) => listing.source)).size,
    matchStrictness,
    dataUpdatedAt: working[0]?.fetchedAt ?? new Date().toISOString(),
    methodology: [
      "Se buscan anuncios del mismo modelo, año próximo y combustible en coches.net (mercado España).",
      "Se filtran por versión, potencia, cambio y kilometraje, y se excluyen precios atípicos con vallas IQR.",
      "El valor base es la mediana ponderada por similitud de los anuncios que quedan.",
      "Se aplican ajustes solo con datos que has aportado o que se observan en los comparables.",
      `El resultado se redondea a ${step} € porque la confianza es ${confidence.label.toLowerCase()}: dar un precio al euro sería falsa precisión.`,
    ],
    limitations,
    segmentReference: null,
    marketSearchUrl: searchUrl,
  };
}
