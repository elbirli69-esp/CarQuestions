import type { Scorecard, ScoreDimension } from "@/types/analysis";
import type { ListingQuality } from "@/types/analysis";
import type { VehicleIdentity } from "@/types/identity";
import type { MarketValuation } from "@/types/market";
import type { TechnicalKnowledge } from "@/types/technical";
import type { Vehicle } from "@/types/vehicle";
import { currentYear } from "@/lib/utils/format";
import { clamp } from "@/lib/utils/math";

function overallLabel(score: number): string {
  if (score >= 82) return "Muy favorable";
  if (score >= 70) return "Favorable";
  if (score >= 55) return "Con matices";
  if (score >= 40) return "Desfavorable";
  return "Muy desfavorable";
}

/**
 * Scorecard por dimensiones (FASE 10).
 *
 * Regla: si no hay datos, score = null. No se inventa una nota para rellenar
 * el gráfico.
 */
export function buildScorecard(options: {
  vehicle: Vehicle;
  identity: VehicleIdentity;
  market: MarketValuation;
  knowledge: TechnicalKnowledge;
  listingQuality: ListingQuality;
}): Scorecard {
  const { vehicle, identity, market, knowledge, listingQuality } = options;
  const dimensions: ScoreDimension[] = [];

  // --- Precio ---------------------------------------------------------------
  if (market.status !== "observed" || market.estimatedPrice == null) {
    dimensions.push({
      id: "price",
      label: "Precio",
      score: null,
      explanation:
        market.status === "unavailable"
          ? "Sin anuncios comparables no hay precio de mercado con el que contrastar."
          : "Hay muy pocos anuncios equivalentes para puntuar el precio.",
      evidence: "Mercado no observable",
      evidenceLevel: null,
      confidence: "none",
    });
  } else if (market.percentDifference == null) {
    dimensions.push({
      id: "price",
      label: "Precio",
      score: null,
      explanation: "Hay mercado, pero falta el precio del anuncio para compararlo.",
      evidence: `${market.comparableCount} comparables`,
      evidenceLevel: null,
      confidence: market.confidence.level,
    });
  } else {
    const delta = market.percentDifference;
    const score = Math.round(clamp(82 - delta * 220, 15, 95));
    dimensions.push({
      id: "price",
      label: "Precio",
      score,
      explanation: market.summary,
      evidence: `${market.comparableCount} anuncios · confianza ${market.confidence.label.toLowerCase()}`,
      evidenceLevel: null,
      confidence: market.confidence.level,
    });
  }

  // --- Fiabilidad -----------------------------------------------------------
  if (knowledge.status === "blocked" || knowledge.reliability.score == null) {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: null,
      explanation: knowledge.reliability.basis,
      evidence: knowledge.status === "blocked" ? "Identificación inválida" : "Sin ficha documentada",
      evidenceLevel: knowledge.reliability.evidenceLevel,
      confidence: "none",
    });
  } else {
    dimensions.push({
      id: "reliability",
      label: "Fiabilidad",
      score: knowledge.reliability.score,
      explanation: knowledge.reliability.basis,
      evidence: `${knowledge.reliability.sampleSize} ficha(s) · nivel ${knowledge.reliability.evidenceLevel ?? "?"}`,
      evidenceLevel: knowledge.reliability.evidenceLevel,
      confidence: knowledge.reliability.evidenceLevel === "A" ? "high" : "medium",
    });
  }

  // --- Mantenimiento --------------------------------------------------------
  if (!knowledge.maintenance.available) {
    dimensions.push({
      id: "maintenance",
      label: "Mantenimiento",
      score: null,
      explanation: knowledge.maintenance.notes[0] ?? "Sin plan de mantenimiento documentado.",
      evidence: "Sin datos",
      evidenceLevel: null,
      confidence: "none",
    });
  } else {
    const base = knowledge.reliability.score ?? 70;
    dimensions.push({
      id: "maintenance",
      label: "Mantenimiento",
      score: Math.round(clamp(base - 4, 35, 88)),
      explanation:
        knowledge.maintenance.estimatedYearlyCostEur != null
          ? `Coste orientativo del segmento: ~${knowledge.maintenance.estimatedYearlyCostEur.toLocaleString("es-ES")} €/año. No es una factura de este coche.`
          : "Hay intervalos documentados, pero no una cifra anual fiable para esta versión.",
      evidence: `Nivel ${knowledge.maintenance.evidenceLevel ?? "?"}`,
      evidenceLevel: knowledge.maintenance.evidenceLevel,
      confidence: knowledge.maintenance.evidenceLevel === "A" ? "medium" : "low",
    });
  }

  // --- Depreciación (heurística explícita, confianza baja) ------------------
  const age = currentYear() - vehicle.year;
  const kmPerYear = vehicle.mileage / Math.max(age, 1);
  dimensions.push({
    id: "depreciation",
    label: "Depreciación",
    score: Math.round(clamp(88 - age * 3 - Math.max(0, kmPerYear - 18000) / 2000, 25, 90)),
    explanation: `${age} años y ~${Math.round(kmPerYear).toLocaleString("es-ES")} km/año. Es una aproximación, no una predicción de reventa.`,
    evidence: "Heurística por edad y uso",
    evidenceLevel: "D",
    confidence: "low",
  });

  // --- Mercado --------------------------------------------------------------
  dimensions.push({
    id: "market",
    label: "Adecuación al mercado",
    score:
      market.status === "observed" && market.comparableCount >= 8
        ? Math.round(clamp(68 + market.comparableCount * 0.35, 55, 92))
        : market.status === "observed"
          ? Math.round(clamp(50 + market.comparableCount * 2, 40, 70))
          : null,
    explanation:
      market.status === "observed"
        ? `${market.comparableCount} anuncios equivalentes en coches.net.`
        : "Sin mercado observable no hay referencia de demanda.",
    evidence: market.matchStrictness
      ? `Filtros ${market.matchStrictness === "strict" ? "estrechos" : market.matchStrictness === "relaxed" ? "relajados" : "amplios"}`
      : "Sin comparables",
    evidenceLevel: null,
    confidence: market.confidence.level,
  });

  // --- Calidad del anuncio --------------------------------------------------
  dimensions.push({
    id: "listing",
    label: "Calidad del anuncio",
    score: listingQuality.score,
    explanation: listingQuality.summary,
    evidence: `${listingQuality.criteria.filter((c) => c.present).length}/${listingQuality.criteria.length} criterios cubiertos`,
    evidenceLevel: "D",
    confidence: listingQuality.score >= 60 ? "medium" : "low",
  });

  // --- Riesgo de compra -----------------------------------------------------
  const severe = [...knowledge.modelSpecific, ...knowledge.platformShared].filter(
    (f) => f.severity === "high",
  ).length;
  const riskScore =
    identity.status === "invalid"
      ? null
      : Math.round(
          clamp(
            78 -
              severe * 8 -
              (identity.status === "suspicious" ? 12 : 0) -
              (listingQuality.score < 45 ? 10 : 0),
            20,
            90,
          ),
        );
  dimensions.push({
    id: "purchase_risk",
    label: "Riesgo de compra",
    score: riskScore,
    explanation:
      identity.status !== "ok"
        ? "Hay datos del vehículo que no cuadran; el riesgo está sin evaluar."
        : severe > 0
          ? `${severe} patrón(es) grave(s) documentado(s) para esta mecánica.`
          : knowledge.status === "specific"
            ? "No hay patrones graves documentados para este modelo."
            : "Sin ficha técnica específica: el riesgo mecánico está sin evaluar.",
    evidence: knowledge.status,
    evidenceLevel: knowledge.modelSpecific.length > 0 ? "A" : knowledge.platformShared.length > 0 ? "B" : null,
    confidence: knowledge.status === "specific" ? "medium" : "low",
  });

  const scored = dimensions.filter((d) => d.score != null);
  const overall =
    scored.length >= 3
      ? Math.round(scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length)
      : null;

  return {
    dimensions,
    overall,
    overallLabel: overall == null ? null : overallLabel(overall),
    summary:
      overall == null
        ? "No hay datos suficientes para un score global. No se inventa una nota."
        : `${overall}/100 · ${overallLabel(overall)}`,
    scoredCount: scored.length,
  };
}
