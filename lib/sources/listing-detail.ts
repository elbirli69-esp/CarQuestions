import { matchProviderByUrl } from "@/lib/sources/registry";
import { fetchListingDetail as fetchCochesNetDetail } from "@/lib/sources/coches-net/fetch-listing-detail";
import { fetchListingDetail as fetchAutoScoutDetail } from "@/lib/sources/autoscout24/fetch-listing-detail";
import { isAllowedListingUrl } from "@/lib/vehicles/url-policy";

export interface UnifiedListingDetail {
  price?: number;
  year?: number;
  mileage?: number;
  power?: number;
  fuel?: import("@/types/vehicle").FuelType;
  transmission?: import("@/types/vehicle").TransmissionType;
  location?: string;
  description?: string;
  equipment?: string[];
}

export function isAllowedListingDetailUrl(url: string): boolean {
  return isAllowedListingUrl(url);
}

export async function fetchListingDetailFromUrl(url: string): Promise<UnifiedListingDetail | null> {
  const provider = matchProviderByUrl(url);
  if (!provider) return null;

  if (provider.id === "coches.net") {
    const detail = await fetchCochesNetDetail(url);
    if (!detail) return null;
    return {
      price: detail.price,
      year: detail.year,
      mileage: detail.mileage,
      power: detail.power,
      fuel: detail.fuel,
      transmission: detail.transmission,
      location: detail.location,
      description: detail.description,
      equipment: detail.equipment,
    };
  }

  if (provider.id === "autoscout24") {
    const detail = await fetchAutoScoutDetail(url);
    if (!detail) return null;
    return {
      price: detail.price,
      year: detail.year,
      mileage: detail.mileage,
      power: detail.power,
      fuel: detail.fuel,
      transmission: detail.transmission,
      location: detail.location,
      description: detail.description,
      equipment: detail.equipment,
    };
  }

  return null;
}
