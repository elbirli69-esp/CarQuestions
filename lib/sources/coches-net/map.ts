import type { ComparableQuery, VehicleListing } from "@/types/listing";
import type { FuelType } from "@/types/vehicle";
import type { ParsedCochesNetAd } from "@/lib/sources/coches-net/parse";
import { createVehicleId } from "@/lib/utils/math";

function computeSimilarity(
  query: ComparableQuery,
  listing: Pick<ParsedCochesNetAd, "year" | "mileage" | "fuel" | "power">,
): number {
  const yearDelta = listing.year != null ? Math.abs(query.year - listing.year) : 2;
  const mileageDelta =
    listing.mileage != null ? Math.abs(query.mileage - listing.mileage) : query.mileage * 0.3;
  let score = 0.94 - yearDelta * 0.06 - mileageDelta / 450000;

  if (query.fuel && listing.fuel) {
    score += query.fuel === listing.fuel ? 0.04 : -0.05;
  }
  if (query.power && listing.power) {
    score -= Math.min(0.08, Math.abs(query.power - listing.power) / 800);
  }

  return Math.max(0.4, Math.min(0.99, score));
}

function fuelCompatible(queryFuel: FuelType | undefined, listingFuel: FuelType | undefined): boolean {
  if (!queryFuel || !listingFuel) return true;
  if (queryFuel === listingFuel) return true;
  // Híbridos enchufables vs híbridos: aceptar como cercanos.
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

  const fuelFiltered = yearFiltered.filter((listing) => fuelCompatible(query.fuel, listing.fuel));

  let pool = fuelFiltered;
  if (pool.length < 5) pool = yearFiltered;
  if (pool.length < 5) {
    // Ampliar ventana de año antes de quedarnos sin comparables.
    const wider = mapped.filter((listing) => {
      if (listing.year == null) return true;
      return Math.abs(listing.year - query.year) <= yearWindow + 2;
    });
    pool = wider.length >= 5 ? wider : mapped;
  }

  return pool
    .slice()
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, options.limit);
}
