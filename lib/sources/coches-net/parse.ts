import type { FuelType, SellerType, TransmissionType } from "@/types/vehicle";

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

/**
 * Parsea anuncios SSR de la página de resultados de coches.net.
 * Estructura observada: `data-ad-id`, `card-ad-title`, `card-adPrice-price`, `mt-CardAd-attrItem`.
 */
export function parseSearchHtml(
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
      version: extractVersion(title, context.brand, context.model),
    });
  }

  return ads;
}

/** Extrae datos básicos de una URL de anuncio si la ficha no es scrapeable. */
export function parseListingUrl(url: string): Partial<ParsedCochesNetAd> | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "coches.net") return null;
    const match =
      parsed.pathname.match(/-(\d{6,})-covo\.aspx$/i) || parsed.pathname.match(/-(\d{6,})\.aspx$/i);
    if (!match) return null;
    return {
      id: match[1],
      url: parsed.toString(),
      title: decodeHtml(
        parsed.pathname.replace(/^\//, "").replace(/-covo\.aspx$/i, "").replace(/-/g, " "),
      ),
    };
  } catch {
    return null;
  }
}
