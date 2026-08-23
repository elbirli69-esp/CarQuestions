import type {
  PurchaseRecommendation,
  PurchaseVerdict,
  ScoreDimension,
  ValuationResult,
  VehicleScorecard,
} from "@/types/valuation";
import type { VehicleValidationResult } from "@/types/vehicle-validation";
import type { ReliabilitySummary } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import type { VehicleListing } from "@/types/listing";
import { clamp } from "@/lib/utils/math";

const PURCHASE_LABELS: Record<PurchaseVerdict, { label: string; emoji: string }> = {
  good_opportunity: { label: "Buena oportunidad", emoji: "🟢" },
  fair_price: { label: "Precio razonable", emoji: "🟡" },
  caution: { label: "Compraría con precaución", emoji: "🟠" },
  do_not_buy: { label: "No compraría sin investigar más", emoji: "🔴" },
  insufficient_data: { label: "Datos insuficientes", emoji: "⚪" },
};

export function buildPurchaseRecommendation(options: {
  vehicle: Vehicle;
  valuation: ValuationResult;
  scores: VehicleScorecard;
  validation: VehicleValidationResult;
  reliability: ReliabilitySummary;
}): PurchaseRecommendation {
  const { valuation, scores, validation, reliability } = options;

  if (!validation.isConsistent) {
    return {
      verdict: "do_not_buy",
      label: PURCHASE_LABELS.do_not_buy.label,
      emoji: PURCHASE_LABELS.do_not_buy.emoji,
      summary:
        "Los datos del vehículo son incoherentes. Corrige marca, modelo, versión y combustible antes de confiar en el análisis.",
    };
  }

  if (valuation.origin === "ai_estimate" && valuation.comparableCount === 0) {
    return {
      verdict: "insufficient_data",
      label: PURCHASE_LABELS.insufficient_data.label,
      emoji: PURCHASE_LABELS.insufficient_data.emoji,
      summary:
        "Sin anuncios comparables reales no podemos decir si es una buena compra. Usa esto como orientación, no como veredicto.",
    };
  }

  const priceScore = scores.dimensions.find((d) => d.id === "price")?.score;
  const reliabilityScore = reliability.score;
  const overall = scores.overall;

  let verdict: PurchaseVerdict = "fair_price";

  if (
    valuation.origin === "observed" &&
    (valuation.verdict === "barato" || valuation.verdict === "muy_barato") &&
    (reliabilityScore == null || reliabilityScore >= 70) &&
    validation.severity === "valid"
  ) {
    verdict = "good_opportunity";
  } else if (
    valuation.verdict === "muy_caro" ||
    (reliabilityScore != null && reliabilityScore < 55) ||
    validation.severity === "suspicious"
  ) {
    verdict = "caution";
  } else if (overall != null && overall < 50) {
    verdict = "do_not_buy";
  } else if (valuation.verdict === "caro") {
    verdict = "caution";
  }

  const { label, emoji } = PURCHASE_LABELS[verdict];
  const pricePart =
    valuation.percentDifference != null && valuation.origin === "observed"
      ? ` Precio ${valuation.percentDifference > 0 ? "por encima" : "por debajo"} del mercado (~${Math.abs(valuation.percentDifference * 100).toFixed(1).replace(".", ",")} %).`
      : "";

  return {
    verdict,
    label,
    emoji,
    summary: `${label}.${pricePart} Confianza del precio: ${valuation.confidenceTier ?? "baja"}.`,
  };
}

function overallLabel(score: number): string {
  if (score >= 88) return "Excelente oportunidad";
  if (score >= 78) return "Buena oportunidad";
  if (score >= 65) return "Aceptable con matices";
  if (score >= 50) return "Regular";
  return "Poco recomendable";
}

export function scoreVehicle(options: {
  vehicle: Vehicle;
  valuation: ValuationResult;
  reliability: ReliabilitySummary;
  listings: VehicleListing[];
  validation: VehicleValidationResult;
}): VehicleScorecard {
  const { vehicle, valuation, reliability, listings, validation } = options;
  const hasObservedMarket = listings.length >= 5 && valuation.origin === "observed";
  const dimensions: ScoreDimension[] = [];

  if (!validation.isConsistent) {
    return {
      dimensions: [
        {
          id: "data",
          label: "Coherencia de datos",
          score: null,
          reason: "Hay incoherencias en los datos del vehículo. Corrígelas para obtener puntuaciones fiables.",
          origin: "observed",
          insufficientData: true,
        },
      ],
      overall: null,
      overallLabel: null,
      summary: "Sin score global: datos del vehículo incoherentes.",
    };
  }

  if (valuation.percentDifference == null) {
    dimensions.push({
      id: "price",
      label: "Precio",
      score: null,
      reason: "No hay precio anunciado, así que no se puntúa la relación calidad-precio.",
      origin: "observed",
      insufficientData: true,
    });
  } else if (valuation.origin === "ai_estimate") {
    dimensions.push({
      id: "price",
      label: "Precio",
      score: null,
      reason: "Hay precio anunciado, pero sin anuncios reales conectados la comparación de mercado no es fiable.",
      origin: "ai_estimate",
      insufficientData: true,
    });
  } else {
    const delta = valuation.percentDifference;
    const score = Math.round(clamp(82 - delta * 220, 20, 99));
    dimensions.push({
      id: "price",
      label: "Precio",
      score,
      reason: valuation.summary,
      origin: "observed",
      insufficientData: false,
    });
  }

  if (!reliability.available || reliability.score == null || !reliability.hasModelSpecificEvidence) {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: null,
      reason: reliability.hasModelSpecificEvidence === false
        ? "No hay evidencia suficiente para afirmar fiabilidad específica de este modelo."
        : "No hay una ficha de fiabilidad suficientemente específica para este vehículo.",
      origin: "ai_estimate",
      insufficientData: true,
    });
  } else {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: reliability.score,
      reason: reliability.notes[0] ?? `Basado en conocimiento curado para ${vehicle.brand} ${vehicle.model}.`,
      origin: "observed",
      insufficientData: false,
    });
  }

  const maintenanceScore =
    reliability.available && reliability.hasModelSpecificEvidence
      ? Math.round(clamp((reliability.score ?? 70) - 6, 40, 90))
      : null;
  dimensions.push({
    id: "maintenance",
    label: "Coste de mantenimiento",
    score: maintenanceScore,
    reason:
      maintenanceScore == null
        ? "Sin datos suficientes para estimar el coste de mantenimiento de este modelo."
        : "Estimación orientativa según la base de conocimiento, no facturas de este coche.",
    origin: reliability.available ? "observed" : "ai_estimate",
    insufficientData: maintenanceScore == null,
  });

  const age = new Date().getFullYear() - vehicle.year;
  const kmPerYear = vehicle.mileage / Math.max(age, 1);
  if (age <= 0) {
    dimensions.push({
      id: "depreciation",
      label: "Depreciación",
      score: null,
      reason: "Año demasiado reciente para estimar depreciación con fiabilidad.",
      origin: "ai_estimate",
      insufficientData: true,
    });
  } else {
    const depreciationScore = Math.round(clamp(90 - age * 3.2 - Math.max(0, kmPerYear - 18000) / 1800, 35, 92));
    dimensions.push({
      id: "depreciation",
      label: "Depreciación",
      score: depreciationScore,
      reason: `Edad ${age} años y ${Math.round(kmPerYear)} km/año. Aproximación heurística, no predicción de reventa.`,
      origin: "ai_estimate",
      insufficientData: false,
    });
  }

  dimensions.push({
    id: "market",
    label: "Adecuación al mercado",
    score: hasObservedMarket ? Math.round(clamp(70 + listings.length * 0.4, 55, 90)) : null,
    reason: hasObservedMarket
      ? `Se han usado ${listings.length} anuncios comparables observados del mismo entorno de mercado.`
      : "Sin anuncios de coches.net no hay comparables reales.",
    origin: hasObservedMarket ? "observed" : "ai_estimate",
    insufficientData: !hasObservedMarket,
  });

  const listingScore = null; // computed in listing-analysis qualityScore
  dimensions.push({
    id: "listing",
    label: "Calidad del anuncio",
    score: listingScore,
    reason: "Ver la puntuación de calidad del anuncio en el análisis detallado.",
    origin: "observed",
    insufficientData: true,
  });

  const usable = dimensions.filter((dimension) => dimension.score != null);
  const overall =
    usable.length >= 3
      ? Math.round(usable.reduce((sum, dimension) => sum + (dimension.score ?? 0), 0) / usable.length)
      : null;

  return {
    dimensions,
    overall,
    overallLabel: overall == null ? null : overallLabel(overall),
    summary:
      overall == null
        ? "No hay datos suficientes para un score global. No se inventa una nota."
        : `Score ${overall}/100 · ${overallLabel(overall)}`,
  };
}
