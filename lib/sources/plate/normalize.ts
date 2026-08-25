/** Letras válidas en matrículas europeas españolas actuales (sin vocales). */
const EURO_SUFFIX = /^(\d{4})([B-DF-HJ-NP-TV-Z]{3})$/;
const PROVINCIAL = /^([A-Z]{1,2})(\d{4})([A-Z]{2})$/;

export function normalizeSpanishPlate(raw: string): string | null {
  const compact = raw.trim().toUpperCase().replace(/[\s\-.]/g, "");
  if (!compact) return null;
  if (EURO_SUFFIX.test(compact) || PROVINCIAL.test(compact)) return compact;
  return null;
}

export function formatSpanishPlateDisplay(normalized: string): string {
  const euro = normalized.match(EURO_SUFFIX);
  if (euro) return `${euro[1]} ${euro[2]}`;
  const prov = normalized.match(PROVINCIAL);
  if (prov) return `${prov[1]}-${prov[2]}-${prov[3]}`;
  return normalized;
}

export function isEuropeanSpanishPlate(normalized: string): boolean {
  return EURO_SUFFIX.test(normalized);
}
