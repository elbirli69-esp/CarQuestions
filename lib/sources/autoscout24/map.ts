import type { ComparableQuery, VehicleListing } from "@/types/listing";
import type { FuelType, TransmissionType } from "@/types/vehicle";
import type { MatchStrictness } from "@/types/valuation";
import type { ParsedAutoScout24Ad } from "@/lib/sources/autoscout24/parse";
import { createVehicleId, normalizeKey } from "@/lib/utils/math";

const MIN_SIMILARITY_STRICT = 0.62;
const MIN_SIMILARITY_RELAXED = 0.52;

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
  return delta <= Math.max(12, queryPower * 0.1);
}

function mileageClose(queryMileage: number, listingMileage: number | undefined): boolean {
  if (listingMileage == null) return true;
  const delta = Math.abs(queryMileage - listingMileage);
  return delta <= Math.max(20000, queryMileage * 0.35);
}

function yearClose(queryYear: number, listingYear: number | undefined, window: number): boolean {
  if (listingYear == null) return true;
  return Math.abs(queryYear - listingYear) <= window;
}

function transmissionCompatible(
  query: TransmissionType | undefined,
  listing: TransmissionType | undefined,
): boolean {
  if (!query || !listing) return true;
  return query === listing;
}

function computeSimilarity(
  query: ComparableQuery,
  listing: Pick<
    ParsedAutoScout24Ad,
    "year" | "mileage" | "fuel" | "power" | "version" | "title" | "transmission"
  >,
): number {
  const yearDelta = listing.year != null ? Math.abs(query.year - listing.year) : 2;
  const mileageDelta =
    listing.mileage != null ? Math.abs(query.mileage - listing.mileage) : query.mileage * 0.3;
  let score = 0.94 - yearDelta * 0.06 - mileageDelta / 450000;

  if (query.fuel && listing.fuel) {
    score += query.fuel === listing.fuel ? 0.04 : -0.06;
  }
  if (query.power && listing.power) {
    score -= Math.min(0.12, Math.abs(query.power - listing.power) / 650);
  }
  if (query.transmission && listing.transmission) {
    score += query.transmission === listing.transmission ? 0.03 : -0.05;
  }
  score += versionOverlap(query.version, listing.version, listing.title);

  return Math.max(0.3, Math.min(0.99, score));
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

export function mapAutoScout24Ad(
  ad: ParsedAutoScout24Ad,
  query: ComparableQuery,
  fetchedAt: string,
  matchStrictness: MatchStrictness = "strict",
): VehicleListing | null {
  if (!ad.price || ad.price <= 0) return null;

  const titleKey = normalizeKey(ad.title);
  const brandKey = normalizeKey(query.brand);
  const modelKey = normalizeKey(query.model);
  if (
    brandKey &&
    titleKey &&
    !titleKey.includes(brandKey) &&
    !brandKey.split(" ").every((t) => titleKey.includes(t))
  ) {
    if (!(modelKey && titleKey.includes(modelKey))) return null;
  }
  if (modelKey && modelKey.length >= 2 && titleKey && !titleKey.includes(modelKey)) {
    const modelTokens = modelKey.split(" ").filter((t) => t.length >= 2);
    if (modelTokens.length > 0 && !modelTokens.every((t) => titleKey.includes(t))) {
      return null;
    }
  }

  return {
    id: createVehicleId(["autoscout24", ad.id]),
    source: "autoscout24",
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
    publicationDate: ad.publicationDate,
    bodyType: ad.bodyType as VehicleListing["bodyType"],
    similarity: computeSimilarity(query, ad),
    isDemo: false,
    fetchedAt,
    dataKind: "dynamic",
    rawData: {
      autoscout24Id: ad.id,
      matchStrictness,
      titleVerified: true,
    },
  };
}

function preferTightPool(
  pool: VehicleListing[],
  minSize: number,
  predicate: (listing: VehicleListing) => boolean,
): VehicleListing[] {
  const tight = pool.filter(predicate);
  return tight.length >= minSize ? tight : pool;
}

export interface FilteredAutoScout24Result {
  listings: VehicleListing[];
  matchStrictness: MatchStrictness;
  mappedCount: number;
  coreCount: number;
}

export function mapAndFilterAutoScout24Ads(
  ads: ParsedAutoScout24Ad[],
  query: ComparableQuery,
  options: { fetchedAt: string; limit: number; yearWindow?: number },
): FilteredAutoScout24Result {
  const yearWindow = options.yearWindow ?? 2;
  const mapped = ads
    .map((ad) => mapAutoScout24Ad(ad, query, options.fetchedAt, "strict"))
    .filter((listing): listing is VehicleListing => listing != null);

  const core = mapped.filter(
    (listing) =>
      yearClose(query.year, listing.year, yearWindow) && fuelCompatible(query.fuel, listing.fuel),
  );

  let matchStrictness: MatchStrictness = "strict";
  let pool = core;

  pool = preferTightPool(pool, 6, (listing) => yearClose(query.year, listing.year, 1));
  pool = preferTightPool(pool, 5, (listing) =>
    transmissionCompatible(query.transmission, listing.transmission),
  );
  pool = preferTightPool(pool, 5, (listing) =>
    versionMatches(query.version, listing.version, listing.title),
  );
  pool = preferTightPool(pool, 5, (listing) => powerClose(query.power, listing.power));
  pool = preferTightPool(pool, 5, (listing) => mileageClose(query.mileage, listing.mileage));

  const highSim = pool.filter((listing) => (listing.similarity ?? 0) >= MIN_SIMILARITY_STRICT);
  if (highSim.length >= 5) {
    pool = highSim;
  } else {
    const midSim = pool.filter((listing) => (listing.similarity ?? 0) >= MIN_SIMILARITY_RELAXED);
    if (midSim.length >= 5) pool = midSim;
  }

  if (pool.length < 5) {
    const yearOnly = mapped.filter((listing) => yearClose(query.year, listing.year, yearWindow));
    if (yearOnly.length >= 5) {
      pool = yearOnly.filter((listing) => (listing.similarity ?? 0) >= MIN_SIMILARITY_RELAXED);
      if (pool.length < 5) pool = yearOnly;
      matchStrictness = "relaxed";
    }
  }
  if (pool.length < 5) {
    const wider = mapped.filter((listing) => yearClose(query.year, listing.year, yearWindow + 2));
    pool = wider.length >= 5 ? wider : mapped;
    matchStrictness = "broad";
  }

  const listings = pool
    .slice()
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, options.limit)
    .map((listing) => ({
      ...listing,
      rawData: { ...listing.rawData, matchStrictness },
    }));

  return {
    listings,
    matchStrictness,
    mappedCount: mapped.length,
    coreCount: core.length,
  };
}
