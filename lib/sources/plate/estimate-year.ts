import { isEuropeanSpanishPlate } from "@/lib/sources/plate/normalize";

/** Año orientativo de inicio de cada serie de letra (matrícula europea española). */
const LETTER_SERIES_ANCHOR: Record<string, number> = {
  B: 2000,
  C: 2002,
  D: 2004,
  F: 2006,
  G: 2008,
  H: 2010,
  J: 2014,
  K: 2017,
  L: 2019,
  M: 2022,
  N: 2024,
  P: 2025,
  R: 2025,
  S: 2026,
  T: 2026,
  V: 2026,
  W: 2026,
  X: 2026,
  Y: 2026,
  Z: 2026,
};

/**
 * Estima el año de matriculación desde matrícula europea (0000XXX).
 * Aproximación: serie de letras + progresión del bloque numérico.
 */
export function estimateRegistrationYearFromPlate(normalizedPlate: string): number | undefined {
  if (!isEuropeanSpanishPlate(normalizedPlate)) return undefined;

  const digits = Number(normalizedPlate.slice(0, 4));
  const letter = normalizedPlate.charAt(4);
  const anchor = LETTER_SERIES_ANCHOR[letter];
  if (!anchor || !Number.isFinite(digits)) return undefined;

  const progress = digits / 9999;
  const yearOffset = progress >= 0.85 ? 1 : 0;
  const year = anchor + yearOffset;
  const currentYear = new Date().getFullYear();
  return Math.min(Math.max(year, 2000), currentYear);
}
