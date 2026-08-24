import type { FuelType, SellerType, TransmissionType } from "@/types/vehicle";
import {
  inferTransmission,
  parseFuel,
} from "@/lib/sources/coches-net/parse";
import { extractJsonLdBlocks, findInGraph } from "@/lib/sources/autoscout24/structured";

const BASE_URL = "https://www.autoscout24.es";

export interface ParsedAutoScout24Ad {
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
}

export interface ParsedAutoScout24ListingUrl {
  id: string;
  url: string;
  brand?: string;
  model?: string;
  version?: string;
  year?: number;
  fuel?: FuelType;
  location?: string;
}

function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${BASE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function parseYearFromProductionDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^(19|20)\d{2}/);
  return match ? Number(match[0]) : undefined;
}

function parsePowerFromEngine(engine: unknown): number | undefined {
  if (!engine || typeof engine !== "object") return undefined;
  const engines = Array.isArray(engine) ? engine : [engine];
  for (const item of engines) {
    if (!item || typeof item !== "object") continue;
    const powers = (item as Record<string, unknown>).enginePower;
    const list = Array.isArray(powers) ? powers : powers ? [powers] : [];
    for (const power of list) {
      if (!power || typeof power !== "object") continue;
      const rec = power as Record<string, unknown>;
      const unit = String(rec.unitCode ?? rec.unitText ?? "").toUpperCase();
      const value = Number(rec.value);
      if (!Number.isFinite(value)) continue;
      if (unit === "BHP" || unit === "CV") return Math.round(value);
      if (unit === "KWT" || unit === "KW") return Math.round(value * 1.341);
    }
  }
  return undefined;
}

function normalizeSellerType(seller: unknown): SellerType | undefined {
  if (!seller || typeof seller !== "object") return undefined;
  const type = String((seller as Record<string, unknown>)["@type"] ?? "");
  if (type.includes("AutoDealer") || type.includes("Organization")) return "dealer";
  if (type.includes("Person")) return "private";
  return undefined;
}

function parseLocationFromSeller(seller: unknown): string | undefined {
  if (!seller || typeof seller !== "object") return undefined;
  const address = (seller as Record<string, unknown>).address;
  if (!address || typeof address !== "object") return undefined;
  const locality = (address as Record<string, unknown>).addressLocality;
  return typeof locality === "string" ? locality.trim() : undefined;
}

function carItemFromListItem(item: unknown): Record<string, unknown> | undefined {
  if (!item || typeof item !== "object") return undefined;
  const rec = item as Record<string, unknown>;
  const nested = rec.item;
  if (nested && typeof nested === "object") return nested as Record<string, unknown>;
  return rec;
}

export function parseSearchHtml(
  html: string,
  context?: { brand?: string; model?: string },
): ParsedAutoScout24Ad[] {
  const ads: ParsedAutoScout24Ad[] = [];
  const seen = new Set<string>();

  for (const block of extractJsonLdBlocks(html)) {
    const searchPage = findInGraph<Record<string, unknown>>(block, "SearchResultsPage");
    const mainEntity = searchPage?.mainEntity as Record<string, unknown> | undefined;
    const elements = mainEntity?.itemListElement;
    if (!Array.isArray(elements)) continue;

    for (const listItem of elements) {
      const car = carItemFromListItem(listItem);
      if (!car) continue;

      const path = String(
        (listItem as Record<string, unknown>).url ??
          (car.offers as Record<string, unknown> | undefined)?.url ??
          car["@id"] ??
          "",
      );
      const url = absoluteUrl(path.split("#")[0] ?? path);
      const idMatch = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      const id = idMatch?.[1] ?? url;
      if (seen.has(id)) continue;
      seen.add(id);

      const brandObj = car.brand as Record<string, unknown> | undefined;
      const brandName =
        typeof brandObj?.name === "string" ? brandObj.name : context?.brand ?? undefined;
      const modelName = typeof car.model === "string" ? car.model : context?.model ?? undefined;
      const version =
        typeof car.vehicleConfiguration === "string"
          ? car.vehicleConfiguration
          : typeof car.name === "string"
            ? car.name.replace(/^(BMW|Audi|Volkswagen|Mercedes-Benz|SEAT|Toyota)\s+/i, "").trim()
            : undefined;

      const mileageObj = car.mileageFromOdometer as Record<string, unknown> | undefined;
      const mileage = mileageObj?.value != null ? Number(mileageObj.value) : undefined;

      const offers = car.offers as Record<string, unknown> | undefined;
      const price = offers?.price != null ? Number(offers.price) : undefined;
      const seller = offers?.seller ?? offers?.offeredBy;

      const fuelRaw = typeof car.fuelType === "string" ? car.fuelType : undefined;
      const transmissionRaw =
        typeof car.vehicleTransmission === "string" ? car.vehicleTransmission : undefined;

      const title =
        typeof car.name === "string"
          ? car.name
          : [brandName, modelName, version].filter(Boolean).join(" ").trim() || "Anuncio";

      ads.push({
        id,
        url,
        title,
        price: Number.isFinite(price) && price! > 0 ? Math.round(price!) : undefined,
        mileage: Number.isFinite(mileage) ? Math.round(mileage!) : undefined,
        fuel: fuelRaw ? parseFuel(fuelRaw) : undefined,
        transmission: transmissionRaw
          ? inferTransmission(transmissionRaw, version)
          : inferTransmission(title, version),
        version,
        location: parseLocationFromSeller(seller),
        sellerType: normalizeSellerType(seller),
        power: parsePowerFromEngine(car.vehicleEngine),
        year: parseYearFromProductionDate(
          typeof car.productionDate === "string" ? car.productionDate : undefined,
        ),
      });
    }
  }

  return ads;
}

/** Parsea slug /anuncios/bmw-x1-sdrive-18ia-gasolina-negro-cat_...-uuid */
export function parseListingUrl(raw: string): ParsedAutoScout24ListingUrl | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.endsWith("autoscout24.es") && !host.endsWith("autoscout24.com")) return null;
    if (url.protocol !== "https:") return null;

    const idMatch = url.pathname.match(
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    if (!idMatch?.[1]) return null;

    const slug = url.pathname.replace(/^\/anuncios\//, "").replace(/\/$/, "");
    const tokens = slug.split("-").filter(Boolean);
    const fuelToken = tokens.find((t) =>
      /^(gasolina|diesel|diésel|electrico|eléctrico|hibrido|híbrido|glp|gnc)$/i.test(t),
    );
    const fuel = fuelToken ? parseFuel(fuelToken) : undefined;

    let brand: string | undefined;
    let model: string | undefined;
    if (tokens.length >= 2) {
      brand = tokens[0]?.replace(/_/g, " ");
      model = tokens[1]?.replace(/_/g, " ");
      if (brand) brand = brand.charAt(0).toUpperCase() + brand.slice(1);
    }

    const versionTokens = tokens.slice(2);
    const stopWords = new Set(["gasolina", "diesel", "diésel", "electrico", "eléctrico", "hibrido", "híbrido", "negro", "blanco", "azul", "rojo", "gris", "cat"]);
    const versionParts: string[] = [];
    for (const token of versionTokens) {
      if (stopWords.has(token.toLowerCase()) || token.startsWith("cat_")) break;
      versionParts.push(token);
    }
    const version = versionParts.length > 0 ? versionParts.join(" ") : undefined;

    return {
      id: idMatch[1],
      url: url.toString(),
      brand,
      model,
      version,
      fuel,
    };
  } catch {
    return null;
  }
}
