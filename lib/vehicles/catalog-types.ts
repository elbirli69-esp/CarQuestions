/**
 * Segmentos de path coches.net que no son marcas ni modelos.
 */
export const CATALOG_SEGMENT_DENYLIST = new Set([
  "diesel",
  "gasolina",
  "electrico",
  "hibrido",
  "hibrido-enchufable",
  "glp",
  "gnc",
  "berlina",
  "familiar",
  "coupe",
  "cabrio",
  "monovolumen",
  "compact",
  "4x4",
  "suv",
  "industrial",
  "automaticos",
  "financiados",
  "pickup",
  "combi",
  "monovolumen",
  "todoterreno",
  "furgoneta",
  "furgon",
  "microcar",
  "clasicos",
  "km0",
  "nuevo",
  "ocasion",
  "seminuevo",
  "particulares",
  "profesionales",
  "andalucia",
  "aragon",
  "asturias",
  "baleares",
  "canarias",
  "cantabria",
  "castilla_y_leon",
  "castilla_la_mancha",
  "catalunya",
  "comunitat_valenciana",
  "extremadura",
  "galicia",
  "madrid",
  "melilla",
  "ceuta",
  "pais_vasco",
  "rioja",
  "navarra",
  "murcia",
  "barcelona",
  "valencia",
  "sevilla",
  "malaga",
  "a_coruna",
  "alava",
  "albacete",
  "alicante",
  "almeria",
  "avila",
  "badajoz",
  "burgos",
  "caceres",
  "cadiz",
  "castellon",
  "ciudad_real",
  "cordoba",
  "cuenca",
  "girona",
  "granada",
  "guadalajara",
  "guipuzcoa",
  "huelva",
  "huesca",
  "jaen",
  "leon",
  "lleida",
  "lugo",
  "ourense",
  "palencia",
  "pontevedra",
  "salamanca",
  "segovia",
  "soria",
  "tarragona",
  "teruel",
  "toledo",
  "valladolid",
  "zamora",
  "zaragoza",
  "bizkaia",
  "gipuzkoa",
]);

/** Slug → nombre comercial (marcas). */
export const BRAND_SLUG_TO_NAME: Record<string, string> = {
  "mercedes-benz": "Mercedes-Benz",
  "alfa-romeo": "Alfa Romeo",
  "land-rover": "Land Rover",
  "rolls-royce": "Rolls-Royce",
  "aston-martin": "Aston Martin",
  citroen: "Citroën",
  skoda: "Skoda",
  seat: "SEAT",
  bmw: "BMW",
  mini: "Mini",
  ds: "DS",
  byd: "BYD",
  mg: "MG",
  "mercedes": "Mercedes-Benz",
  vw: "Volkswagen",
  "iveco-pegaso": "Iveco Pegaso",
  "ich-x": "ICH-X",
};

/** Slug → nombre modelo (casos especiales). */
export const MODEL_SLUG_TO_NAME: Record<string, string> = {
  "serie-1": "Serie 1",
  "serie-2": "Serie 2",
  "serie-3": "Serie 3",
  "serie-4": "Serie 4",
  "serie-5": "Serie 5",
  "serie-6": "Serie 6",
  "serie-7": "Serie 7",
  "clase-a": "Clase A",
  "clase-b": "Clase B",
  "clase-c": "Clase C",
  "clase-e": "Clase E",
  "clase-s": "Clase S",
  "clase-g": "Clase G",
  "t-roc": "T-Roc",
  "t-cross": "T-Cross",
  id3: "ID.3",
  id4: "ID.4",
  id5: "ID.5",
  id7: "ID.7",
  "cx-3": "CX-3",
  "cx-30": "CX-30",
  "cx-5": "CX-5",
  "cx-60": "CX-60",
  "cx-80": "CX-80",
  leon: "León",
  "a3-sportback": "A3 Sportback",
  ix: "iX",
  ix1: "iX1",
  ix2: "iX2",
  ix3: "iX3",
};

export function slugToBrandName(slug: string): string {
  if (BRAND_SLUG_TO_NAME[slug]) return BRAND_SLUG_TO_NAME[slug];
  return slug
    .split("-")
    .map((part) => {
      if (part.length <= 3) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function slugToModelName(slug: string): string {
  if (MODEL_SLUG_TO_NAME[slug]) return MODEL_SLUG_TO_NAME[slug];
  if (/^i\d/.test(slug)) return slug.toUpperCase().replace("I", "i");
  if (/^ix\d?/.test(slug)) return slug.replace(/^ix/, "iX");
  return slug
    .split("-")
    .map((part, index) => {
      if (index === 0 && part.length <= 3) return part.toUpperCase();
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function normalizeCatalogKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export interface CatalogModel {
  slug: string;
  name: string;
}

export interface CatalogBrand {
  slug: string;
  name: string;
  models: CatalogModel[];
}

export interface VehicleCatalog {
  generatedAt: string;
  source: string;
  brands: CatalogBrand[];
}

export function extractBrandSlugsFromHtml(html: string): string[] {
  const re = /coches\.net\/([a-z0-9-]+)\/segunda-mano/gi;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const slug = match[1]!.toLowerCase();
    if (CATALOG_SEGMENT_DENYLIST.has(slug)) continue;
    if (slug.includes("euros") || slug.includes("plazas")) continue;
    found.add(slug);
  }
  return [...found].sort();
}

export function extractModelSlugsFromHtml(html: string, brandSlug: string): string[] {
  const re = new RegExp(`coches\\.net\\/${brandSlug}\\/([a-z0-9-]+)\\/segunda-mano`, "gi");
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const slug = match[1]!.toLowerCase();
    if (CATALOG_SEGMENT_DENYLIST.has(slug)) continue;
    found.add(slug);
  }
  return [...found].sort();
}
