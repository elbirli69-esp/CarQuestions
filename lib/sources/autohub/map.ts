import type { ComparableQuery, VehicleListing } from "@/types/listing";
import type { SellerType } from "@/types/vehicle";
import { extractAutoHubItems } from "@/lib/sources/autohub/client";
import { createVehicleId, roundTo } from "@/lib/utils/math";

const MAKE_ALIASES: Record<string, string> = {
  bmw: "BMW",
  audi: "Audi",
  volkswagen: "Volkswagen",
  vw: "Volkswagen",
  mercedes: "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  toyota: "Toyota",
  ford: "Ford",
  mazda: "Mazda",
  hyundai: "Hyundai",
  kia: "Kia",
  nissan: "Nissan",
  honda: "Honda",
  volvo: "Volvo",
  seat: "SEAT",
  skoda: "Skoda",
  cupra: "Cupra",
  peugeot: "Peugeot",
  renault: "Renault",
  citroen: "Citroen",
  porsche: "Porsche",
  lexus: "Lexus",
  tesla: "Tesla",
};

export function normalizeAutoHubMake(brand: string): string {
  const key = brand.trim().toLowerCase();
  return MAKE_ALIASES[key] ?? brand.trim();
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function milesToKm(value: number): number {
  return Math.round(value * 1.60934);
}

function inferSellerType(raw: Record<string, unknown>): SellerType {
  const dealer = raw.dealer;
  if (dealer && typeof dealer === "object") return "dealer";
  const sellerType = readString(raw.seller_type ?? raw.sellerType)?.toLowerCase();
  if (sellerType?.includes("dealer")) return "dealer";
  if (sellerType?.includes("private")) return "private";
  return "dealer";
}

function buildLocation(raw: Record<string, unknown>): string | undefined {
  const dealer = raw.dealer;
  if (dealer && typeof dealer === "object") {
    const dealerRecord = dealer as Record<string, unknown>;
    const nested = dealerRecord.location;
    if (nested && typeof nested === "object") {
      const locationRecord = nested as Record<string, unknown>;
      const city = readString(locationRecord.city);
      const state = readString(locationRecord.state);
      if (city && state) return `${city}, ${state}`;
      return city ?? state;
    }
    const city = readString(dealerRecord.city);
    const state = readString(dealerRecord.state);
    if (city && state) return `${city}, ${state}`;
    return city ?? state;
  }

  const location = raw.location;
  if (location && typeof location === "object") {
    const locationRecord = location as Record<string, unknown>;
    const city = readString(locationRecord.city);
    const state = readString(locationRecord.state);
    if (city && state) return `${city}, ${state}`;
    return city ?? state;
  }

  return readString(raw.city ?? raw.location);
}

function computeSimilarity(query: ComparableQuery, listingYear?: number, listingMileage?: number): number {
  const yearDelta = listingYear != null ? Math.abs(query.year - listingYear) : 2;
  const mileageDelta =
    listingMileage != null ? Math.abs(query.mileage - listingMileage) : query.mileage * 0.25;
  return Math.max(0.45, Math.min(0.98, 0.95 - yearDelta * 0.05 - mileageDelta / 500000));
}

export function mapAutoHubListing(
  raw: Record<string, unknown>,
  query: ComparableQuery,
  options: { fetchedAt: string; usdToEur: number },
): VehicleListing | null {
  const make = readString(raw.make ?? raw.brand) ?? normalizeAutoHubMake(query.brand);
  const model = readString(raw.model) ?? query.model;
  const year = readNumber(raw.year) ?? query.year;
  const trim = readString(raw.trim ?? raw.version);

  const priceUsd = readNumber(raw.price ?? raw.listPrice ?? raw.askingPrice);
  if (!priceUsd || priceUsd <= 0) return null;

  const mileageRaw = readNumber(raw.mileage ?? raw.odometer ?? raw.miles);
  const mileage =
    mileageRaw != null && mileageRaw > 0
      ? raw.mileageUnit === "km" || raw.mileage_unit === "km"
        ? Math.round(mileageRaw)
        : milesToKm(mileageRaw)
      : undefined;

  const idValue = readString(raw.id ?? raw.listingId ?? raw.vehicleId) ?? createVehicleId([make, model, String(year), String(mileage ?? 0), String(priceUsd)]);
  const location = buildLocation(raw);
  const url = readString(raw.source_url ?? raw.url ?? raw.listingUrl ?? raw.vdpUrl ?? raw.dealer_url);
  const images = Array.isArray(raw.images)
    ? raw.images
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "url" in item) {
            return readString((item as Record<string, unknown>).url);
          }
          return undefined;
        })
        .filter((item): item is string => Boolean(item))
    : readString(raw.image ?? raw.photoUrl)
      ? [readString(raw.image ?? raw.photoUrl) as string]
      : undefined;

  return {
    id: createVehicleId(["autohub", idValue]),
    source: "autohub",
    url,
    title: [make, model, trim, year].filter(Boolean).join(" "),
    brand: make,
    model,
    version: trim,
    year,
    mileage,
    price: roundTo(priceUsd * options.usdToEur, 50),
    location,
    sellerType: inferSellerType(raw),
    images,
    rawData: raw,
    similarity: computeSimilarity(query, year, mileage),
    isDemo: false,
    fetchedAt: options.fetchedAt,
    dataKind: "dynamic",
  };
}

export function mapAutoHubListings(
  payload: unknown,
  query: ComparableQuery,
  options: { fetchedAt: string; usdToEur: number; limit: number },
): VehicleListing[] {
  const items = extractAutoHubItems(payload);
  const listings = items
    .map((item) => mapAutoHubListing(item, query, options))
    .filter((listing): listing is VehicleListing => listing != null);

  return listings
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, options.limit);
}
