import type { ConfidenceLevel } from "@/types/identity";
import type { ConfidenceAssessment } from "@/types/market";

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  very_low: "Muy baja",
  none: "Sin base",
};

export const CONFIDENCE_EXPLANATIONS: Record<ConfidenceLevel, string> = {
  high: "Muchos anuncios equivalentes y datos del coche completos.",
  medium: "Hay comparables suficientes, pero faltan datos o la muestra es corta.",
  low: "Pocos comparables o filtros amplios: tómalo como orientación.",
  very_low: "Apenas hay anuncios equivalentes. No decidas solo con esto.",
  none: "No hay mercado observable para este coche.",
};

export interface ConfidenceInput {
  comparableCount: number;
  averageSimilarity: number;
  matchStrictness: "strict" | "relaxed" | "broad" | null;
  /** Dispersión intercuartílica relativa al precio estimado. */
  iqrRatio: number;
  /** 0–1: cuántos campos relevantes ha aportado el usuario. */
  dataCompleteness: number;
  /** El vehículo tiene incoherencias detectadas. */
  identityWarnings: number;
}

/**
 * Escala de confianza honesta (FASE 9).
 *
 * La versión anterior devolvía un porcentaje con dos cifras junto a un precio
 * al euro, lo que transmitía una precisión que el dato no tenía. Aquí manda el
 * nivel cualitativo y el número solo se usa internamente.
 */
export function assessConfidence(input: ConfidenceInput): ConfidenceAssessment {
  const drivers: string[] = [];

  if (input.comparableCount === 0) {
    return {
      level: "none",
      label: CONFIDENCE_LABELS.none,
      drivers: ["No se ha encontrado ningún anuncio comparable."],
      score: 0,
    };
  }

  let score = 20;
  score += Math.min(38, input.comparableCount * 2.6);
  score += input.averageSimilarity * 26;
  score += input.dataCompleteness * 14;

  if (input.matchStrictness === "relaxed") score -= 10;
  if (input.matchStrictness === "broad") score -= 20;
  if (input.iqrRatio > 0.3) score -= 12;
  else if (input.iqrRatio > 0.2) score -= 6;
  if (input.averageSimilarity < 0.65) score -= 12;
  score -= input.identityWarnings * 8;

  score = Math.round(Math.max(0, Math.min(100, score)));

  let level: ConfidenceLevel;
  if (input.comparableCount <= 2) level = "very_low";
  else if (input.comparableCount <= 5) level = "low";
  else if (score >= 74 && input.comparableCount >= 12 && input.matchStrictness === "strict") {
    level = "high";
  } else if (score >= 55) level = "medium";
  else if (score >= 38) level = "low";
  else level = "very_low";

  drivers.push(
    input.comparableCount === 1
      ? "1 anuncio comparable"
      : `${input.comparableCount} anuncios comparables`,
  );
  drivers.push(`Similitud media ${(input.averageSimilarity * 100).toFixed(0)} %`);
  if (input.matchStrictness) {
    drivers.push(
      input.matchStrictness === "strict"
        ? "Filtros estrechos (mismo modelo, año y combustible)"
        : input.matchStrictness === "relaxed"
          ? "Filtros relajados para reunir muestra"
          : "Filtros amplios: mezcla años o versiones",
    );
  }
  if (input.iqrRatio > 0.2) {
    drivers.push(`Precios muy dispersos entre sí (${(input.iqrRatio * 100).toFixed(0)} % del valor)`);
  }
  if (input.dataCompleteness < 0.5) {
    drivers.push("Faltan datos del coche que afinarían la comparación");
  }
  if (input.identityWarnings > 0) {
    drivers.push("Hay datos del vehículo que no cuadran del todo");
  }

  return { level, label: CONFIDENCE_LABELS[level], drivers, score };
}

/**
 * Redondeo proporcional a la confianza: con muestra pobre no tiene sentido
 * dar un precio al euro. Evita la falsa precisión (FASE 17).
 */
export function roundingStepFor(level: ConfidenceLevel): number {
  switch (level) {
    case "high":
      return 100;
    case "medium":
      return 250;
    case "low":
      return 500;
    default:
      return 1000;
  }
}
