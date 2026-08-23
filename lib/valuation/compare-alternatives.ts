import type { VehicleContext } from "@/types/ai";
import type { VehicleListing } from "@/types/listing";
import type { Vehicle } from "@/types/vehicle";
import { estimateMarketAnchor } from "@/lib/sources/demo-listings";
import { formatEuro, formatKm, formatPercent } from "@/lib/utils/format";
import { clamp } from "@/lib/utils/math";

export interface ComparisonEntry {
  id: string;
  label: string;
  isSubject: boolean;
  year?: number;
  mileage?: number;
  price?: number;
  estimatedValue: number;
  priceDelta?: number;
  score: number;
  notes: string[];
}

function listingToEstimateInput(listing: VehicleListing, fallback: Vehicle): Vehicle {
  return {
    brand: listing.brand,
    model: listing.model,
    version: listing.version,
    year: listing.year ?? fallback.year,
    mileage: listing.mileage ?? fallback.mileage,
    fuel: listing.fuel ?? fallback.fuel,
    power: listing.power ?? fallback.power,
    transmission: listing.transmission ?? fallback.transmission,
    bodyType: listing.bodyType ?? fallback.bodyType,
  };
}

function scoreOption(price: number | undefined, estimated: number, mileage: number, year: number): { score: number; notes: string[] } {
  const notes: string[] = [];
  if (!price) {
    notes.push("Sin precio anunciado");
    return { score: 50, notes };
  }

  const delta = (price - estimated) / estimated;
  let score = 72 - delta * 120;

  if (delta <= -0.08) notes.push("Por debajo de la referencia orientativa");
  else if (delta <= 0.04) notes.push("Cerca de la referencia orientativa");
  else if (delta <= 0.12) notes.push("Ligeramente por encima de la referencia");
  else notes.push("Claramente por encima de la referencia");

  const age = new Date().getFullYear() - year;
  const kmPerYear = mileage / Math.max(age, 1);
  if (kmPerYear > 22000) {
    score -= 8;
    notes.push("Kilometraje anual alto");
  } else if (kmPerYear < 12000) {
    score += 4;
    notes.push("Kilometraje anual contenido");
  }

  return { score: clamp(Math.round(score), 20, 95), notes };
}

export function buildAlternativeComparison(context: VehicleContext): {
  entries: ComparisonEntry[];
  recommendation: string;
  lines: string[];
} {
  const { vehicle, marketData, alternatives } = context;

  if (alternatives.length === 0) {
    return {
      entries: [],
      recommendation:
        "No hay alternativas comparables conectadas en este momento. Revisa anuncios reales de rivales del segmento (misma carrocería y rango de precio) y compara historial, km y fallos típicos del motor.",
      lines: [],
    };
  }

  const subjectPrice = vehicle.advertisedPrice ?? marketData.estimatedPrice ?? undefined;
  const subjectEstimate = marketData.estimatedPrice;
  if (subjectEstimate == null) {
    return {
      entries: [],
      recommendation:
        "Sin estimación de mercado del vehículo analizado no se pueden puntuar alternativas de forma honesta.",
      lines: [],
    };
  }
  const subjectScoring = scoreOption(subjectPrice, subjectEstimate, vehicle.mileage, vehicle.year);

  const subject: ComparisonEntry = {
    id: "subject",
    label: `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""}`,
    isSubject: true,
    year: vehicle.year,
    mileage: vehicle.mileage,
    price: vehicle.advertisedPrice,
    estimatedValue: subjectEstimate,
    priceDelta:
      vehicle.advertisedPrice != null ? vehicle.advertisedPrice - subjectEstimate : undefined,
    score: subjectScoring.score,
    notes: [
      marketData.verdictLabel ? `Valoración: ${marketData.verdictLabel}` : "Sin veredicto de precio",
      ...subjectScoring.notes,
    ],
  };

  const altEntries = alternatives.map((listing) => {
    const estimateInput = listingToEstimateInput(listing, vehicle);
    const estimatedValue = estimateMarketAnchor(estimateInput);
    const price = listing.price;
    const year = listing.year ?? vehicle.year;
    const mileage = listing.mileage ?? vehicle.mileage;
    const scoring = scoreOption(price, estimatedValue, mileage, year);

    return {
      id: listing.id,
      label: `${listing.brand} ${listing.model}`,
      isSubject: false,
      year: listing.year,
      mileage: listing.mileage,
      price: listing.price,
      estimatedValue,
      priceDelta: price != null ? price - estimatedValue : undefined,
      score: scoring.score,
      notes: scoring.notes,
    } satisfies ComparisonEntry;
  });

  const ranked = [subject, ...altEntries].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const lines = ranked.map((entry) => {
    const pricePart = entry.price != null ? formatEuro(entry.price) : "sin precio";
    const estimatePart = formatEuro(entry.estimatedValue);
    const deltaPart =
      entry.priceDelta != null
        ? ` (${entry.priceDelta <= 0 ? "" : "+"}${formatPercent(entry.priceDelta / entry.estimatedValue)} vs referencia)`
        : "";
    const tag = entry.isSubject ? " · tu coche" : " · alternativa";
    return `- ${entry.label} ${entry.year ?? "?"} · ${entry.mileage ? formatKm(entry.mileage) : "?"} · ${pricePart}${tag}\n  Referencia ~${estimatePart}${deltaPart}. Puntuación orientativa ${entry.score}/100. ${entry.notes.join(". ")}.`;
  });

  let recommendation: string;
  if (best?.isSubject) {
    recommendation = `Con los datos disponibles, el ${subject.label} queda mejor posicionado que las alternativas del segmento. Conviene contrastar historial, inspección y fallos típicos del motor concreto antes de decidir.`;
  } else if (best) {
    recommendation = `La opción más equilibrada sería el ${best.label} (${best.year ?? "?"}): precio más razonable frente a su referencia. El ${vehicle.brand} ${vehicle.model} sigue siendo defendible si el precio pedido está ${marketData.verdictLabel ? `catalogado como «${marketData.verdictLabel}»` : "cerca de la referencia"} y el historial es mejor documentado.`;
  } else {
    recommendation = "No hay alternativas suficientes para recomendar una opción concreta.";
  }

  if (context.reliabilityData.knownIssues[0]) {
    recommendation += ` En tu ${vehicle.brand} ${vehicle.model}, vigila especialmente: ${context.reliabilityData.knownIssues[0].title}.`;
  }

  return { entries: ranked, recommendation, lines };
}

export function formatAlternativeComparisonAnswer(context: VehicleContext): string {
  const { lines, recommendation } = buildAlternativeComparison(context);
  const v = context.vehicle;

  if (lines.length === 0) {
    return [
      `No tengo rivales comparables conectados para este ${v.brand} ${v.model}.`,
      recommendation,
      "Busca anuncios reales de modelos equivalentes (misma carrocería, precio y km similares) y compara historial e inspección.",
    ].join("\n\n");
  }

  return [
    `Comparación de este ${v.brand} ${v.model} frente a rivales del segmento:`,
    lines.join("\n"),
    recommendation,
  ].join("\n\n");
}
