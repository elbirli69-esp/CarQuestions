import type { ComparableQuery, VehicleListing } from "@/types/listing";
import type { FuelType } from "@/types/vehicle";
import type { ParsedCochesNetAd } from "@/lib/sources/coches-net/parse";
import { createVehicleId, normalizeKey } from "@/lib/utils/math";

function versionOverlap(
  queryVersion: string | undefined,
  listingVersion: string | undefined,
  title: string,
): number {
  if (!queryVersion?.trim()) return 0;
  const needle = normalizeKey(queryVersion);
  if (!needle) return 0;
  const haystack = normalizeKey([listingVersion, title].filter(Boolean).join(" "));
  if (!haystack) return 0;
  if (haystack.includes(needle) || needle.includes(haystack)) return 0.08;
  const tokens = needle.split(" ").filter((token) => token.length >= 3);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits === tokens.length ? 0.06 : hits > 0 ? 0.02 : -0.04;
}

function versionMatches(
  queryVersion: string | undefined,
  listingVersion: string | undefined,
  title: string,
): boolean {
  return versionOverlap(queryVersion, listingVersion, title) >= 0.05;
}

function powerClose(queryPower: number | undefined, listingPower: number | undefined): boolean {
  if (!queryPower || !listingPower) return true;
  const delta = Math.abs(queryPower - listingPower);
  return delta <= Math.max(15, queryPower * 0.12);
}

function mileageClose(queryMileage: number, listingMileage: number | undefined): boolean {
  if (listingMileage == null) return true;
  const delta = Math.abs(queryMileage - listingMileage);
  return delta <= Math.max(25000, queryMileage * 0.4);
}

function computeSimilarity(
  query: ComparableQuery,
  listing: Pick<ParsedCochesNetAd, "year" | "mileage" | "fuel" | "power" | "version" | "title">,
): number {
  const yearDelta = listing.year != null ? Math.abs(query.year - listing.year) : 2;
  const mileageDelta =
    listing.mileage != null ? Math.abs(query.mileage - listing.mileage) : query.mileage * 0.3;
  let score = 0.94 - yearDelta * 0.06 - mileageDelta / 450000;

  if (query.fuel && listing.fuel) {
    score += query.fuel === listing.fuel ? 0.04 : -0.05;
  }
  if (query.power && listing.power) {
    score -= Math.min(0.1, Math.abs(query.power - listing.power) / 700);
  }
  score += versionOverlap(query.version, listing.version, listing.title);

  return Math.max(0.35, Math.min(0.99, score));
}

function fuelCompatible(queryFuel: FuelType | undefined, listingFuel: FuelType | undefined): boolean {
  if (!queryFuel || !listingFuel) return true;
  if (queryFuel === listingFuel) return true;
  if (
    (queryFuel === "hybrid" && listingFuel === "plugin_hybrid") ||
    (queryFuel === "plugin_hybrid" && listingFuel === "hybrid")
  ) {
    return true;
  }
  return false;
}

export function mapCochesNetAd(
  ad: ParsedCochesNetAd,
  query: ComparableQuery,
  fetchedAt: string,
): VehicleListing | null {
  if (!ad.price || ad.price <= 0) return null;

  return {
    id: createVehicleId(["coches.net", ad.id]),
    source: "coches.net",
    url: ad.url,
    title: ad.title,
    brand: query.brand,
    model: query.model,
    version: ad.version,
    year: ad.year,
    mileage: ad.mileage,
    fuel: ad.fuel,
    power: ad.power,
    transmission: ad.transmission,
    price: ad.price,
    location: ad.location,
    sellerType: ad.sellerType,
    similarity: computeSimilarity(query, ad),
    isDemo: false,
    fetchedAt,
    dataKind: "dynamic",
    rawData: { cochesNetId: ad.id },
  };
}

function preferTightPool(pool: VehicleListing[], minSize: number, predicate: (listing: VehicleListing) => boolean): VehicleListing[] {
  const tight = pool.filter(predicate);
  return tight.length >= minSize ? tight : pool;
}

export function mapAndFilterCochesNetAds(
  ads: ParsedCochesNetAd[],
  query: ComparableQuery,
  options: { fetchedAt: string; limit: number; yearWindow?: number },
): VehicleListing[] {
  const yearWindow = options.yearWindow ?? 2;
  const mapped = ads
    .map((ad) => mapCochesNetAd(ad, query, options.fetchedAt))
    .filter((listing): listing is VehicleListing => listing != null);

  const yearFiltered = mapped.filter((listing) => {
    if (listing.year == null) return true;
    return Math.abs(listing.year - query.year) <= yearWindow;
  });

  let pool = yearFiltered.filter((listing) => fuelCompatible(query.fuel, listing.fuel));
  if (pool.length < 5) pool = yearFiltered;
  if (pool.length < 5) {
    const wider = mapped.filter((listing) => {
      if (listing.year == null) return true;
      return Math.abs(listing.year - query.year) <= yearWindow + 2;
    });
    pool = wider.length >= 5 ? wider : mapped;
  }

  // Si hay masa crítica, estrechar por versión / potencia / km.
  pool = preferTightPool(pool, 5, (listing) =>
    versionMatches(query.version, listing.version, listing.title),
  );
  pool = preferTightPool(pool, 5, (listing) => powerClose(query.power, listing.power));
  pool = preferTightPool(pool, 5, (listing) => mileageClose(query.mileage, listing.mileage));

  return pool
    .slice()
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, options.limit);
}
