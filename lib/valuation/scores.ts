import type { VehicleListing } from "@/types/listing";
import type { ListingQuality, ScoreDimension, VehicleScorecard, ValuationResult } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import type { ReliabilitySummary } from "@/types/valuation";
import { clamp } from "@/lib/utils/math";
import { bandFromScore } from "@/lib/valuation/confidence";

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
  listingQuality?: ListingQuality;
}): VehicleScorecard {
  const { vehicle, valuation, reliability, listings, listingQuality } = options;
  const hasObservedMarket = listings.length >= 5 && valuation.origin === "observed";
  const dimensions: ScoreDimension[] = [];

  if (valuation.percentDifference == null || valuation.origin === "ai_estimate" || valuation.marketStatus === "none") {
    dimensions.push({
      id: "price",
      label: "Precio",
      score: null,
      reason:
        valuation.marketStatus === "none" || valuation.origin === "ai_estimate"
          ? "Sin anuncios comparables no hay puntuación de precio de mercado."
          : "No hay precio anunciado, así que no se puntúa la relación calidad-precio.",
      origin: valuation.origin === "observed" ? "observed" : "ai_estimate",
      insufficientData: true,
      evidence: "Sin mediana observada fiable.",
      confidence: "muy_baja",
    });
  } else if (valuation.marketStatus === "insufficient") {
    dimensions.push({
      id: "price",
      label: "Precio",
      score: null,
      reason: "Hay demasiados pocos comparables para puntuar el precio con rigor.",
      origin: "observed",
      insufficientData: true,
      evidence: `${listings.length} anuncio(s)`,
      confidence: "muy_baja",
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
      evidence: `${valuation.comparableCount} comparables`,
      confidence: valuation.confidenceBand ?? bandFromScore(valuation.confidence),
    });
  }

  if (!reliability.available || reliability.score == null || reliability.insufficientEvidence) {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: null,
      reason: reliability.notes[0] ?? "No hay evidencia suficiente específica de este modelo.",
      origin: "ai_estimate",
      insufficientData: true,
      evidence: "Corpus RAG sin match A/B",
      confidence: "muy_baja",
    });
  } else {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: reliability.score,
      reason: reliability.notes[0] ?? `Patrones curados para ${vehicle.brand} ${vehicle.model}.`,
      origin: "observed",
      insufficientData: false,
      evidence: reliability.evidenceLevel === "A" ? "Específico del modelo" : "Marca / motorización",
      confidence: reliability.evidenceLevel === "A" ? "media" : "baja",
    });
  }

  dimensions.push({
    id: "maintenance",
    label: "Mantenimiento",
    score: null,
    reason:
      "No estimamos un coste anual si no hay intervalos documentados para este modelo. Inventarlo sería una falsa certeza.",
    origin: "ai_estimate",
    insufficientData: true,
    evidence: "Sin facturas de este bastidor",
    confidence: "muy_baja",
  });

  dimensions.push({
    id: "depreciation",
    label: "Depreciación",
    score: null,
    reason:
      "Sin serie histórica de este modelo no hay una predicción de reventa honesta. No se inventa una nota.",
    origin: "ai_estimate",
    insufficientData: true,
    evidence: "Sin curva de reventa observada",
    confidence: "muy_baja",
  });

  const riskBits = [
    reliability.knownIssues.some((issue) => issue.severity === "high" && issue.evidenceLevel === "A"),
    !vehicle.accidents,
    !vehicle.maintenanceHistory,
    valuation.verdict === "muy_barato",
  ].filter(Boolean).length;
  const canScoreRisk = Boolean(vehicle.year && vehicle.mileage >= 0);
  dimensions.push({
    id: "risk",
    label: "Riesgo de compra",
    score: canScoreRisk ? Math.round(clamp(78 - riskBits * 10, 30, 90)) : null,
    reason: canScoreRisk
      ? riskBits >= 2
        ? "Faltan papeles o hay señales de riesgo. Prioriza inspección y VIN."
        : "Riesgo contenido con los datos actuales; sigue haciendo falta ver el coche."
      : "Sin datos suficientes para un riesgo numérico.",
    origin: "ai_estimate",
    insufficientData: !canScoreRisk,
    evidence: "Heurística de huecos + issues nivel A",
    confidence: "baja",
  });

  const listingScore = listingQuality?.score ?? null;
  dimensions.push({
    id: "listing",
    label: "Calidad del anuncio",
    score: listingScore,
    reason: listingQuality?.summary ?? "Completa el formulario para puntuar el anuncio.",
    origin: "observed",
    insufficientData: listingScore == null || listingScore < 40,
    evidence: listingQuality ? `${listingQuality.present.length} campos cubiertos` : undefined,
    confidence: listingScore != null && listingScore >= 60 ? "media" : "baja",
  });

  dimensions.push({
    id: "market",
    label: "Adecuación al mercado",
    score: hasObservedMarket ? Math.round(clamp(70 + listings.length * 0.4, 55, 90)) : null,
    reason: hasObservedMarket
      ? `Se han usado ${listings.length} anuncios comparables observados.`
      : "Sin suficientes anuncios comparables no hay adecuación de mercado.",
    origin: hasObservedMarket ? "observed" : "ai_estimate",
    insufficientData: !hasObservedMarket,
    evidence: hasObservedMarket ? `${listings.length} anuncios` : "Mercado no observado",
    confidence: hasObservedMarket ? "media" : "muy_baja",
  });

  const usable = dimensions.filter((dimension) => dimension.score != null);
  const overall = usable.length >= 4
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
