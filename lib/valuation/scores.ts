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
      origin: "demo_model",
      insufficientData: true,
    });
  } else {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: reliability.score,
      reason: reliability.notes[0] ?? "Basado en la ficha de demostración del modelo.",
      origin: "demo_model",
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
      : "Estimación a partir de la ficha de demostración de la marca/motor, no de facturas reales de este coche.",
    origin: "demo_model",
    insufficientData: maintenanceScore == null,
  });

  const age = new Date().getFullYear() - vehicle.year;
  const kmPerYear = vehicle.mileage / Math.max(age, 1);
  const depreciationScore = Math.round(clamp(90 - age * 3.2 - Math.max(0, kmPerYear - 18000) / 1800, 35, 92));
  dimensions.push({
    id: "depreciation",
    label: "Depreciación",
    score: depreciationScore,
    reason: `Edad ${age} años y ${Math.round(kmPerYear)} km/año. Es una aproximación, no una predicción de reventa.`,
    origin: "demo_model",
    insufficientData: false,
  });

  const marketScore = Math.round(clamp(70 + listings.length * 0.4, 55, 90));
  dimensions.push({
    id: "market",
    label: "Adecuación al mercado",
    score: marketScore,
    reason: `Se han usado ${listings.length} comparables de demostración del mismo entorno de mercado.`,
    origin: "demo_model",
    insufficientData: listings.length < 8,
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
