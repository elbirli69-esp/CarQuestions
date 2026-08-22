export function createSeededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function createVehicleId(parts: string[]): string {
  return `veh_${hashString(parts.join("|").toLowerCase())}`;
}

export function roundTo(value: number, step = 50): number {
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  const lowerValue = sorted[lower] ?? sorted[0] ?? 0;
  const upperValue = sorted[upper] ?? sorted[sorted.length - 1] ?? 0;
  return lowerValue * (1 - weight) + upperValue * weight;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SHORT_AUTOMOTIVE_TOKENS = new Set([
  "ac",
  "abs",
  "agm",
  "at",
  "awd",
  "cvt",
  "dc",
  "dct",
  "dpf",
  "dsg",
  "eat",
  "efb",
  "egr",
  "esp",
  "ev",
  "fap",
  "gdi",
  "gpf",
  "hv",
  "hp",
  "ims",
  "itv",
  "kw",
  "obd",
  "oem",
  "pcv",
  "phev",
  "scr",
  "soh",
  "tsi",
  "tdi",
  "vin",
  "vvt",
  "zf",
  "4x4",
]);

export function tokenize(text: string): string[] {
  return normalizeKey(text)
    .split(" ")
    .filter((token) => token.length > 2 || SHORT_AUTOMOTIVE_TOKENS.has(token));
}
