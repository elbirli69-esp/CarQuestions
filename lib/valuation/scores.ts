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
}): VehicleScorecard {
  const { vehicle, valuation, reliability, listings } = options;
  const hasObservedMarket = listings.length >= 5 && valuation.origin === "observed";
  const dimensions: ScoreDimension[] = [];

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

  if (!reliability.available || reliability.score == null) {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: null,
      reason: "No hay una ficha de fiabilidad suficientemente específica para este vehículo.",
      origin: "ai_estimate",
      insufficientData: true,
    });
  } else {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: reliability.score,
      reason: reliability.notes[0] ?? `Basado en la base de conocimiento curada para ${vehicle.brand} ${vehicle.model}.`,
      origin: "observed",
      insufficientData: false,
    });
  }

  const maintenanceScore = reliability.available ? Math.round(clamp((reliability.score ?? 70) - 6, 40, 90)) : null;
  dimensions.push({
    id: "maintenance",
    label: "Coste de mantenimiento",
    score: maintenanceScore,
    reason: maintenanceScore == null
      ? "Sin datos suficientes para estimar el coste de mantenimiento."
      : "Estimación orientativa del segmento según la base de conocimiento curada, no facturas de este coche.",
    origin: reliability.available ? "observed" : "ai_estimate",
    insufficientData: maintenanceScore == null,
  });

  const age = new Date().getFullYear() - vehicle.year;
  const kmPerYear = vehicle.mileage / Math.max(age, 1);
  const depreciationScore = Math.round(clamp(90 - age * 3.2 - Math.max(0, kmPerYear - 18000) / 1800, 35, 92));
  dimensions.push({
    id: "depreciation",
    label: "Depreciación",
    score: depreciationScore,
    reason: `Edad ${age} años y ${Math.round(kmPerYear)} km/año. Es una aproximación heurística, no una predicción de reventa.`,
    origin: "ai_estimate",
    insufficientData: false,
  });

  dimensions.push({
    id: "market",
    label: "Adecuación al mercado",
    score: hasObservedMarket ? Math.round(clamp(70 + listings.length * 0.4, 55, 90)) : null,
    reason: hasObservedMarket
      ? `Se han usado ${listings.length} anuncios comparables observados del mismo entorno de mercado.`
      : "Sin anuncios de coches.net no hay comparables reales. Reintenta más tarde o consulta el portal directamente antes de decidir.",
    origin: hasObservedMarket ? "observed" : "ai_estimate",
    insufficientData: !hasObservedMarket,
  });

  const filled = [
    vehicle.power,
    vehicle.transmission,
    vehicle.location,
    vehicle.equipment,
    vehicle.maintenanceHistory,
    vehicle.accidents,
    vehicle.generalCondition,
    vehicle.itv,
  ].filter((value) => value !== undefined && value !== "").length;
  const listingScore = Math.round((filled / 8) * 100);
  dimensions.push({
    id: "listing",
    label: "Estado del anuncio",
    score: listingScore,
    reason:
      listingScore < 50
        ? "Faltan datos relevantes del anuncio: conviene pedir más información al vendedor."
        : "El anuncio/formulario incluye bastante contexto, aunque sigue faltando inspección real.",
    origin: "observed",
    insufficientData: listingScore < 40,
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
