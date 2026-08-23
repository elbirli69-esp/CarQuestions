import type { FuelType, SellerType, TransmissionType } from "@/types/vehicle";
import type { CochesNetApiAd } from "@/lib/sources/coches-net/api-types";
import { parseSearchResults } from "@/lib/sources/coches-net/initial-props";

export interface ParsedCochesNetAd {
  id: string;
  url: string;
  title: string;
  price?: number;
  year?: number;
  mileage?: number;
  power?: number;
  fuel?: FuelType;
  transmission?: TransmissionType;
  location?: string;
  sellerType?: SellerType;
  version?: string;
  publicationDate?: string;
  bodyType?: string;
  descriptionSnippet?: string;
  /** Solo disponible vía `__INITIAL_PROPS__`. */
  photos?: string[];
  creationDate?: string;
  hasWarranty?: boolean;
  isCertified?: boolean;
  isFinanced?: boolean;
  environmentalLabel?: string;
  offerType?: string;
  city?: string;
  province?: string;
  bodyTypeId?: number;
  /** Origen de los datos, para trazar calidad en las notas del provider. */
  parsedFrom?: "initial_props" | "cards";
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ")
    .trim();
}

/** Precio en formato ES de listado: `20.600 €`. */
export function parseEuroPrice(raw: string): number | undefined {
  const text = decodeHtml(raw).replace(/\s/g, "").replace(/€/gi, "");
  if (!text) return undefined;
  // Miles con punto; decimales con coma (poco habitual en cards).
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/\./g, "");
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

/** Km en cards: `120,000 km` o `120.000 km`. */
export function parseMileage(raw: string): number | undefined {
  const match = decodeHtml(raw).match(/([\d.,]+)\s*km/i);
  if (!match?.[1]) return undefined;
  const digits = match[1].replace(/[.,\s]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function parsePowerCv(raw: string): number | undefined {
  const match = decodeHtml(raw).match(/([\d.,]+)\s*cv/i);
  if (!match?.[1]) return undefined;
  const value = Number(match[1].replace(/[.,\s]/g, ""));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

export function parseFuel(raw: string): FuelType | undefined {
  const text = decodeHtml(raw).toLowerCase();
  if (!text) return undefined;
  if (text.includes("enchufable") || text.includes("plugin")) return "plugin_hybrid";
  if (text.includes("híbrid") || text.includes("hibrid")) return "hybrid";
  if (text.includes("eléct") || text.includes("elect")) return "electric";
  if (text.includes("diesel") || text.includes("diésel")) return "diesel";
  if (text.includes("gasolina") || text.includes("petrol") || text.includes("bencina")) return "petrol";
  if (text.includes("glp") || text.includes("autogas")) return "lpg";
  if (text.includes("gnc") || text.includes("gas natural")) return "cng";
  return "other";
}

function parseSellerType(chunk: string): SellerType | undefined {
  if (/Particular/i.test(chunk)) return "private";
  if (/Profesional/i.test(chunk)) return "dealer";
  return undefined;
}

/** Infiera cambio desde título/versión (sDrive18dA, Automático, DSG…). */
export function inferTransmission(
  title: string,
  version?: string,
): TransmissionType | undefined {
  const text = `${title} ${version ?? ""}`.toLowerCase();
  if (/manual|cambio manual|\bmt\b/.test(text)) return "manual";
  if (
    /autom[aá]tico|automatic|dsg|dct|pdk|cvt|tiptronic|s\s?tronic|e-?dct|powershift|\bat\b/.test(
      text,
    )
  ) {
    return "automatic";
  }
  // Sufijo A en motorizaciones BMW/Mercedes (18dA, 220dA…) suele ser automático.
  if (/\b\d{2,3}[a-z]?a\b/i.test(version ?? "") || /\b\d{2,3}[tdis]+a\b/i.test(title)) {
    return "automatic";
  }
  return undefined;
}

function extractVersion(title: string, brand: string, model: string): string | undefined {
  let rest = title;
  const brandRe = new RegExp(`^${escapeRegExp(brand)}\\s+`, "i");
  rest = rest.replace(brandRe, "");
  const modelRe = new RegExp(`^${escapeRegExp(model)}\\s*`, "i");
  rest = rest.replace(modelRe, "").trim();
  return rest || undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function absoluteUrl(href: string): string {
  if (href.startsWith("http")) return href;
  return `https://www.coches.net${href.startsWith("/") ? href : `/${href}`}`;
}

/** Convierte un anuncio del JSON de hidratación al formato interno. */
function fromApiAd(ad: CochesNetApiAd, context: { brand: string; model: string }): ParsedCochesNetAd {
  const brand = ad.make ?? context.brand;
  const model = ad.model ?? context.model;
  const title = ad.title ?? `${brand} ${model}`.trim();
  const version = extractVersion(title, brand, model);
  const location = ad.location?.cityLiteral ?? ad.location?.mainProvince;

  return {
    id: ad.id,
    url: absoluteUrl(ad.url ?? ""),
    title,
    price: ad.price && ad.price > 0 ? ad.price : undefined,
    year: ad.year,
    mileage: ad.km,
    power: ad.hp,
    fuel: ad.fuelType ? parseFuel(ad.fuelType) : undefined,
    transmission: inferTransmission(title, version),
    location,
    sellerType: ad.isProfessional == null ? undefined : ad.isProfessional ? "dealer" : "private",
    version,
    publicationDate: ad.publicationDate,
    creationDate: ad.creationDate,
    photos: ad.photos?.length ? ad.photos : ad.img ? [ad.img] : undefined,
    hasWarranty: ad.hasWarranty,
    isCertified: ad.isCertified,
    isFinanced: ad.isFinanced,
    environmentalLabel: ad.environmentalLabel,
    offerType: ad.offerType?.literal,
    city: ad.location?.cityLiteral,
    province: ad.location?.mainProvince,
    bodyTypeId: ad.bodyTypeId,
    descriptionSnippet: title,
    parsedFrom: "initial_props",
  };
}

export interface ParsedCochesNetSearchPage {
  ads: ParsedCochesNetAd[];
  totalResults?: number;
  totalPages?: number;
  source: "initial_props" | "cards";
  /** Anuncios del JSON descartados por no validar. */
  invalidCount?: number;
}

/**
 * Lee una página de resultados priorizando el JSON de hidratación
 * (~35 anuncios con datos completos) y cayendo a las cards SSR
 * (~7 anuncios) si coches.net cambia la estructura.
 */
export function parseSearchPage(
  html: string,
  context: { brand: string; model: string },
): ParsedCochesNetSearchPage {
  const fromJson = parseSearchResults(html);
  if (fromJson) {
    return {
      ads: fromJson.items
        .map((ad) => fromApiAd(ad, context))
        .filter((ad) => ad.id && ad.url),
      totalResults: fromJson.totalResults,
      totalPages: fromJson.totalPages,
      source: "initial_props",
      invalidCount: fromJson.invalidCount,
    };
  }

  return { ads: parseSearchCardsHtml(html, context), source: "cards" };
}

export function parseSearchHtml(
  html: string,
  context: { brand: string; model: string },
): ParsedCochesNetAd[] {
  return parseSearchPage(html, context).ads;
}

/**
 * Parsea anuncios SSR de la página de resultados de coches.net.
 * Estructura observada: `data-ad-id`, `card-ad-title`, `card-adPrice-price`, `mt-CardAd-attrItem`.
 *
 * Fallback: `parseSearchPage` prefiere el JSON de hidratación.
 */
export function parseSearchCardsHtml(
  html: string,
  context: { brand: string; model: string },
): ParsedCochesNetAd[] {
  const parts = html.split(/(?=<div data-ad-position="\d+" data-ad-id="\d+")/);
  const ads: ParsedCochesNetAd[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const header = part.match(/^<div data-ad-position="(\d+)" data-ad-id="(\d+)"/);
    if (!header) continue;

    const id = header[2]!;
    if (seen.has(id)) continue;
    seen.add(id);

    // Limitar al bloque del anuncio (evita mezclar el siguiente).
    const nextIdx = part.indexOf('<div data-ad-position="', 10);
    const chunk = nextIdx > 0 ? part.slice(0, nextIdx) : part.slice(0, 12000);

    const titleMatch = chunk.match(
      /data-testid="card-ad-title"[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i,
    );
    if (!titleMatch) continue;

    const href = titleMatch[1]!;
    const title = decodeHtml(titleMatch[2]!);
    const priceMatch = chunk.match(/data-testid="card-adPrice-price">([^<]+)<\/p>/i);
    const attrItems = [...chunk.matchAll(/class="mt-CardAd-attrItem"[^>]*>([^<]+)</gi)].map((m) =>
      decodeHtml(m[1] ?? ""),
    );

    let year: number | undefined;
    let mileage: number | undefined;
    let power: number | undefined;
    let fuel: FuelType | undefined;
    let location: string | undefined;

    for (const attr of attrItems) {
      if (/^(19|20)\d{2}$/.test(attr)) {
        year = Number(attr);
        continue;
      }
      if (/\bkm\b/i.test(attr)) {
        mileage = parseMileage(attr);
        continue;
      }
      if (/\bcv\b/i.test(attr)) {
        power = parsePowerCv(attr);
        continue;
      }
      const parsedFuel = parseFuel(attr);
      if (
        parsedFuel &&
        /diesel|diésel|gasolina|híbrid|hibrid|eléct|elect|glp|gnc|gas natural|plugin|enchufable/i.test(
          attr,
        )
      ) {
        fuel = parsedFuel;
        continue;
      }
      if (!/\d/.test(attr) && attr.length >= 2 && attr.length <= 40) {
        location = attr;
      }
    }

    const version = extractVersion(title, context.brand, context.model);
    const attrSummary = attrItems.join(" · ").slice(0, 200);
    ads.push({
      id,
      url: absoluteUrl(href),
      title,
      price: priceMatch ? parseEuroPrice(priceMatch[1]!) : undefined,
      year,
      mileage,
      power,
      fuel,
      location,
      sellerType: parseSellerType(chunk),
      version,
      transmission: inferTransmission(title, version),
      descriptionSnippet: `${title}. ${attrSummary}`.slice(0, 200),
      parsedFrom: "cards",
    });
  }

  return ads;
}

/** Extrae datos de un slug de anuncio coches.net. */
export interface ParsedCochesNetListingUrl {
  id: string;
  url: string;
  title: string;
  brand?: string;
  model?: string;
  version?: string;
  year?: number;
  fuel?: FuelType;
  location?: string;
}

const MULTI_WORD_BRANDS: Array<{ slug: string; label: string }> = [
  { slug: "mercedes-benz", label: "Mercedes-Benz" },
  { slug: "alfa-romeo", label: "Alfa Romeo" },
  { slug: "land-rover", label: "Land Rover" },
  { slug: "rolls-royce", label: "Rolls-Royce" },
  { slug: "aston-martin", label: "Aston Martin" },
];

const SINGLE_BRANDS: Record<string, string> = {
  bmw: "BMW",
  audi: "Audi",
  volkswagen: "Volkswagen",
  vw: "Volkswagen",
  seat: "SEAT",
  cupra: "Cupra",
  skoda: "Skoda",
  toyota: "Toyota",
  hyundai: "Hyundai",
  kia: "Kia",
  ford: "Ford",
  renault: "Renault",
  peugeot: "Peugeot",
  citroen: "Citroën",
  opel: "Opel",
  nissan: "Nissan",
  volvo: "Volvo",
  mazda: "Mazda",
  honda: "Honda",
  mini: "Mini",
  porsche: "Porsche",
  tesla: "Tesla",
  dacia: "Dacia",
  fiat: "Fiat",
  jeep: "Jeep",
  lexus: "Lexus",
  suzuki: "Suzuki",
  mitsubishi: "Mitsubishi",
  subaru: "Subaru",
};

const FUEL_SLUGS: Record<string, FuelType> = {
  diesel: "diesel",
  gasolina: "petrol",
  hibrido: "hybrid",
  "electrico-hibrido": "plugin_hybrid",
  electrico: "electric",
  glp: "lpg",
  gnc: "cng",
};

function titleCaseToken(token: string): string {
  if (/^[a-z]\d/i.test(token) || token.length <= 3) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function parseListingUrl(url: string): ParsedCochesNetListingUrl | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "coches.net") return null;

    const pathname = parsed.pathname.replace(/^\//, "");
    const idMatch = pathname.match(/-(\d{6,})-covo\.aspx$/i) || pathname.match(/-(\d{6,})\.aspx$/i);
    if (!idMatch) return null;

    const id = idMatch[1]!;
    const slug = pathname
      .replace(/-covo\.aspx$/i, "")
      .replace(/\.aspx$/i, "")
      .replace(new RegExp(`-${id}$`), "");

    const tokens = slug.split("-").filter(Boolean);
    let brand: string | undefined;
    let rest = tokens;

    for (const multi of MULTI_WORD_BRANDS) {
      const parts = multi.slug.split("-");
      if (rest.slice(0, parts.length).join("-") === multi.slug) {
        brand = multi.label;
        rest = rest.slice(parts.length);
        break;
      }
    }
    if (!brand && rest[0]) {
      brand = SINGLE_BRANDS[rest[0]] ?? titleCaseToken(rest[0]);
      rest = rest.slice(1);
    }

    let year: number | undefined;
    let fuel: FuelType | undefined;
    let location: string | undefined;
    const yearIdx = rest.findIndex((token) => /^(19|20)\d{2}$/.test(token));
    if (yearIdx >= 0) {
      year = Number(rest[yearIdx]);
    }

    for (let i = 0; i < rest.length; i += 1) {
      const two = `${rest[i]}-${rest[i + 1] ?? ""}`;
      if (FUEL_SLUGS[two]) {
        fuel = FUEL_SLUGS[two];
        break;
      }
      if (rest[i] && FUEL_SLUGS[rest[i]!]) {
        fuel = FUEL_SLUGS[rest[i]!];
        break;
      }
    }

    const enIdx = rest.findIndex((token) => token === "en");
    if (enIdx >= 0 && yearIdx >= 0 && enIdx === yearIdx + 1) {
      location = rest
        .slice(enIdx + 1)
        .map(titleCaseToken)
        .join(" ");
    }

    // Modelo: tokens hasta versión/combustible/puertas (5p, 4p) / año.
    const stop = new Set([
      "diesel",
      "gasolina",
      "hibrido",
      "electrico",
      "glp",
      "gnc",
      "5p",
      "3p",
      "4p",
      "2p",
      "en",
    ]);
    const modelTokens: string[] = [];
    for (const token of rest) {
      if (/^(19|20)\d{2}$/.test(token)) break;
      if (stop.has(token)) break;
      if (FUEL_SLUGS[token]) break;
      // Versiones tipo sdrive18d / xdrive25e suelen ir tras el modelo.
      if (/^(sdrive|xdrive|mhev|tdi|tsi|dci|hdi|gti|gt)/i.test(token) && modelTokens.length > 0) break;
      modelTokens.push(token);
      if (modelTokens.length >= 3) break;
    }

    const model = modelTokens.length
      ? modelTokens.map((token, index) => (index === 0 ? titleCaseToken(token) : token)).join(" ")
      : undefined;

    let version: string | undefined;
    if (modelTokens.length > 0) {
      const afterModel = rest.slice(modelTokens.length);
      const versionTokens: string[] = [];
      for (const token of afterModel) {
        if (/^(19|20)\d{2}$/.test(token) || token === "en" || stop.has(token) || FUEL_SLUGS[token]) break;
        if (/^\d+p$/i.test(token)) continue;
        versionTokens.push(token);
      }
      if (versionTokens.length) {
        version = versionTokens.join(" ");
      }
    }

    const title = [brand, model, version].filter(Boolean).join(" ") || slug.replace(/-/g, " ");

    return {
      id,
      url: parsed.toString(),
      title,
      brand,
      model,
      version,
      year,
      fuel,
      location,
    };
  } catch {
    return null;
  }
}
