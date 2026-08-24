import { parseHTML } from "linkedom";
import type { FuelType, SellerType, TransmissionType } from "@/types/vehicle";
import {
  inferTransmission,
  parseFuel,
} from "@/lib/sources/coches-net/parse";
import { parseListingUrl } from "@/lib/sources/autoscout24/parse";
import { extractJsonLdBlocks } from "@/lib/sources/autoscout24/structured";

export interface ParsedAutoScout24Detail {
  url: string;
  title?: string;
  price?: number;
  year?: number;
  mileage?: number;
  power?: number;
  fuel?: FuelType;
  transmission?: TransmissionType;
  location?: string;
  sellerType?: SellerType;
  description?: string;
  equipment?: string[];
  images?: string[];
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
  if (type.includes("AutoDealer")) return "dealer";
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

function mergeCarFromJsonLd(block: unknown, base: ParsedAutoScout24Detail): ParsedAutoScout24Detail {
  if (!block || typeof block !== "object") return base;
  const obj = block as Record<string, unknown>;

  let car: Record<string, unknown> | undefined;
  let offers: Record<string, unknown> | undefined;

  if (obj["@type"] === "Product") {
    offers = obj.offers as Record<string, unknown> | undefined;
    const offered = offers?.itemOffered;
    if (offered && typeof offered === "object") car = offered as Record<string, unknown>;
  } else if (Array.isArray(obj["@type"]) && (obj["@type"] as string[]).includes("Car")) {
    car = obj;
  } else if (obj["@type"] === "Car") {
    car = obj;
  }

  if (!car) return base;

  const mileageObj = car.mileageFromOdometer as Record<string, unknown> | undefined;
  const mileage = mileageObj?.value != null ? Number(mileageObj.value) : undefined;
  const seller = offers?.offeredBy ?? offers?.seller;

  return {
    ...base,
    title: base.title ?? (typeof car.name === "string" ? car.name : undefined),
    price:
      base.price ??
      (offers?.price != null && Number(offers.price) > 0 ? Math.round(Number(offers.price)) : undefined),
    year:
      base.year ??
      parseYearFromProductionDate(
        typeof car.productionDate === "string" ? car.productionDate : undefined,
      ),
    mileage: base.mileage ?? (Number.isFinite(mileage) ? Math.round(mileage!) : undefined),
    power: base.power ?? parsePowerFromEngine(car.vehicleEngine),
    fuel:
      base.fuel ??
      (typeof car.fuelType === "string" ? parseFuel(car.fuelType) : undefined),
    transmission:
      base.transmission ??
      inferTransmission(
        typeof car.vehicleTransmission === "string" ? car.vehicleTransmission : "",
        typeof car.vehicleConfiguration === "string" ? car.vehicleConfiguration : undefined,
      ),
    location: base.location ?? parseLocationFromSeller(seller),
    sellerType: base.sellerType ?? normalizeSellerType(seller),
    images: base.images ?? (typeof car.image === "string" ? [car.image] : undefined),
  };
}

export function parseListingHtml(html: string, url: string): ParsedAutoScout24Detail {
  let detail: ParsedAutoScout24Detail = { url };

  for (const block of extractJsonLdBlocks(html)) {
    detail = mergeCarFromJsonLd(block, detail);
  }

  const { document } = parseHTML(html);
  const title = document.querySelector("h1")?.textContent?.trim();
  if (title && !detail.title) detail.title = title;

  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content");
  if (metaDesc && !detail.description) detail.description = metaDesc.trim();

  if (!detail.fuel) {
    const fromUrl = parseListingUrl(url);
    if (fromUrl?.fuel) detail.fuel = fromUrl.fuel;
    else if (detail.description) detail.fuel = parseFuel(detail.description);
  }

  return detail;
}
