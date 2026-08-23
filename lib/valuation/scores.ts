import type { VehicleListing } from "@/types/listing";
import type { ScoreDimension, VehicleScorecard, ValuationResult } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import type { ReliabilitySummary } from "@/types/valuation";
import { clamp } from "@/lib/utils/math";

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
  listingQualityScore?: number;
  consistencyInvalid?: boolean;
}): VehicleScorecard {
  const { vehicle, valuation, reliability, listings } = options;
  if (options.consistencyInvalid) {
    return {
      dimensions: [
        {
          id: "consistency",
          label: "Coherencia de datos",
          score: null,
          reason: "Combinación marca/modelo/versión/combustible inválida. No se calcula score.",
          origin: "observed",
          insufficientData: true,
        },
      ],
      overall: null,
      overallLabel: null,
      summary: "Sin datos suficientes: corrige la ficha del vehículo antes de puntuar la compra.",
    };
  }

  const hasObservedMarket =
    listings.length >= 5 && valuation.origin === "observed" && !valuation.insufficientMarketData;
  const dimensions: ScoreDimension[] = [];

  if (valuation.percentDifference == null || valuation.estimatedPrice == null) {
    dimensions.push({
      id: "price",
      label: "Precio",
      score: null,
      reason:
        valuation.insufficientMarketData || valuation.origin !== "observed"
          ? "Sin mercado comparable suficiente: no se puntúa el precio."
          : "No hay precio anunciado, así que no se puntúa la relación calidad-precio.",
      origin: valuation.origin === "observed" ? "observed" : "ai_estimate",
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

  if (!reliability.available || reliability.score == null) {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: null,
      reason: reliability.notes[0] ??
        "No hay evidencia suficiente de fiabilidad específica de este modelo.",
      origin: reliability.isDemo ? "demo_model" : "ai_estimate",
      insufficientData: true,
    });
  } else {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: reliability.isDemo ? null : reliability.score,
      reason: reliability.isDemo
        ? "Hay menciones en corpus demo: no se publica score numérico como hecho."
        : (reliability.notes[0] ?? `Basado en conocimiento del modelo ${vehicle.brand} ${vehicle.model}.`),
      origin: reliability.isDemo ? "demo_model" : "observed",
      insufficientData: reliability.isDemo,
    });
  }

  dimensions.push({
    id: "maintenance",
    label: "Mantenimiento",
    score: null,
    reason:
      "No publicamos un score de mantenimiento inventado. Usa la ficha de mantenimiento solo si hay evidencia de modelo.",
    origin: "ai_estimate",
    insufficientData: true,
  });

  // Depreciation: only as heuristic inference, marked insufficient if no market
  const age = new Date().getFullYear() - vehicle.year;
  const kmPerYear = vehicle.mileage / Math.max(age, 1);
  if (hasObservedMarket) {
    const depreciationScore = Math.round(
      clamp(90 - age * 3.2 - Math.max(0, kmPerYear - 18000) / 1800, 35, 92),
    );
    dimensions.push({
      id: "depreciation",
      label: "Depreciación",
      score: depreciationScore,
      reason: `Heurística orientativa: edad ${age} años y ${Math.round(kmPerYear)} km/año. No es predicción de reventa.`,
      origin: "ai_estimate",
      insufficientData: false,
    });
  } else {
    dimensions.push({
      id: "depreciation",
      label: "Depreciación",
      score: null,
      reason: "Sin mercado observado no estimamos depreciación numérica.",
      origin: "ai_estimate",
      insufficientData: true,
    });
  }

  dimensions.push({
    id: "purchase_risk",
    label: "Riesgo de compra",
    score:
      options.listingQualityScore != null
        ? Math.round(clamp(options.listingQualityScore, 0, 100))
        : null,
    reason:
      options.listingQualityScore == null
        ? "Sin evaluación de calidad del anuncio."
        : options.listingQualityScore >= 70
          ? "El anuncio aporta bastante contexto; el riesgo residual es de inspección."
          : "Faltan datos críticos en el anuncio: el riesgo de compra sube.",
    origin: "observed",
    insufficientData: options.listingQualityScore == null,
  });

  dimensions.push({
    id: "market",
    label: "Adecuación al mercado",
    score: hasObservedMarket ? Math.round(clamp(70 + listings.length * 0.4, 55, 90)) : null,
    reason: hasObservedMarket
      ? `Se han usado ${listings.length} anuncios comparables observados.`
      : "Sin anuncios suficientes no hay adecuación de mercado medible.",
    origin: hasObservedMarket ? "observed" : "ai_estimate",
    insufficientData: !hasObservedMarket,
  });

  const listingScore =
    options.listingQualityScore ??
    Math.round(
      ([
        vehicle.power,
        vehicle.transmission,
        vehicle.location,
        vehicle.equipment,
        vehicle.maintenanceHistory,
        vehicle.accidents,
        vehicle.generalCondition,
        vehicle.itv,
      ].filter((value) => value !== undefined && value !== "").length /
        8) *
        100,
    );
  dimensions.push({
    id: "listing",
    label: "Calidad del anuncio",
    score: listingScore,
    reason:
      listingScore < 50
        ? "Faltan datos relevantes (accidentes, ITV, equipamiento, historial…)."
        : "El anuncio/formulario incluye bastante contexto; sigue haciendo falta inspección real.",
    origin: "observed",
    insufficientData: listingScore < 40,
  });

  const usable = dimensions.filter((dimension) => dimension.score != null && !dimension.insufficientData);
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
