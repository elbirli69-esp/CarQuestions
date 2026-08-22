/** Normaliza marca/modelo a slugs de URL de coches.net (`/bmw/x1/segunda-mano/`). */

const BRAND_SLUGS: Record<string, string> = {
  mercedes: "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  vw: "volkswagen",
  "alfa romeo": "alfa-romeo",
  "land rover": "land-rover",
  "range rover": "land-rover",
  "rolls royce": "rolls-royce",
  "aston martin": "aston-martin",
};

const MODEL_SLUGS: Record<string, string> = {
  "serie 1": "serie-1",
  "serie 2": "serie-2",
  "serie 3": "serie-3",
  "serie 4": "serie-4",
  "serie 5": "serie-5",
  "clase a": "clase-a",
  "clase b": "clase-b",
  "clase c": "clase-c",
  "clase e": "clase-e",
  "clase s": "clase-s",
  "t roc": "t-roc",
  "t-roc": "t-roc",
  "t cross": "t-cross",
  "t-cross": "t-cross",
  "id 3": "id3",
  "id 4": "id4",
  "cx 5": "cx-5",
  "cx-5": "cx-5",
  leon: "leon",
  león: "leon",
};

export function toCochesNetSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function brandToCochesNetSlug(brand: string): string {
  const key = brand
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return BRAND_SLUGS[key] ?? toCochesNetSlug(brand);
}

export function modelToCochesNetSlug(model: string): string {
  const key = model
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return MODEL_SLUGS[key] ?? MODEL_SLUGS[model.toLowerCase().trim()] ?? toCochesNetSlug(model);
}

export function buildSearchUrl(brand: string, model: string, page = 1): string {
  const brandSlug = brandToCochesNetSlug(brand);
  const modelSlug = modelToCochesNetSlug(model);
  const base = `https://www.coches.net/${brandSlug}/${modelSlug}/segunda-mano/`;
  if (page <= 1) return base;
  const url = new URL(base);
  url.searchParams.set("pg", String(page));
  return url.toString();
}
