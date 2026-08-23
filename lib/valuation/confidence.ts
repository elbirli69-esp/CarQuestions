import type { ConfidenceBand } from "@/types/evidence";
import type { MatchStrictness } from "@/types/valuation";
import { clamp } from "@/lib/utils/math";

export function bandFromScore(score: number): ConfidenceBand {
  if (score >= 70) return "alta";
  if (score >= 50) return "media";
  if (score >= 30) return "baja";
  return "muy_baja";
}

export function labelForBand(band: ConfidenceBand): string {
  if (band === "alta") return "Alta";
  if (band === "media") return "Media";
  if (band === "baja") return "Baja";
  return "Muy baja";
}

export function marketConfidence(options: {
  comparableCount: number;
  matchStrictness?: MatchStrictness;
  avgSimilarity?: number;
  completeness: number;
  vehicleIdentified: boolean;
}): { score: number; band: ConfidenceBand } {
  const { comparableCount, matchStrictness = "strict", avgSimilarity = 0.6, completeness, vehicleIdentified } = options;

  if (comparableCount === 0) {
    return { score: clamp(12 + completeness * 8, 8, 24), band: "muy_baja" };
  }
  if (comparableCount === 1) {
    return { score: clamp(18 + completeness * 6, 14, 28), band: "muy_baja" };
  }

  let score = 20 + Math.min(comparableCount, 24) * 2.1 + completeness * 10 + avgSimilarity * 22;
  if (!vehicleIdentified) score -= 18;
  if (matchStrictness === "relaxed") score -= 8;
  if (matchStrictness === "broad") score -= 16;
  if (comparableCount < 5) score -= 10;
  if (avgSimilarity < 0.65) score -= 8;

  const clamped = Math.round(clamp(score, 16, 88));
  let band = bandFromScore(clamped);
  if (comparableCount < 3) band = "muy_baja";
  else if (comparableCount < 5) band = band === "alta" ? "media" : band;
  if (!vehicleIdentified && band === "alta") band = "baja";
  return { score: clamped, band };
}
