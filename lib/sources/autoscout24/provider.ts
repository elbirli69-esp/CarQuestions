import type { ComparableQuery } from "@/types/listing";
import type { ListingExtractResult, SourceProvider, SourceSearchResult } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";
import type { VehicleListing } from "@/types/listing";
import { listingToDocument } from "@/lib/rag/documents";
import { fetchAutoScout24Html } from "@/lib/sources/autoscout24/client";
import { AutoScout24FetchError } from "@/lib/sources/autoscout24/errors";
import { fetchListingDetail } from "@/lib/sources/autoscout24/fetch-listing-detail";
import { mapAndFilterAutoScout24Ads } from "@/lib/sources/autoscout24/map";
import {
  parseListingUrl,
  parseSearchHtml,
  type ParsedAutoScout24Ad,
} from "@/lib/sources/autoscout24/parse";
import { buildSearchUrlFromQuery } from "@/lib/sources/autoscout24/slug";

const PAGE_DELAY_MS = 300;

function emptyResult(notes: string[], connected = false): SourceSearchResult {
  return {
    listings: [],
    documents: [],
    isDemo: false,
    fetchedAt: new Date().toISOString(),
    notes,
    connected,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSearchPage(
  query: ComparableQuery,
  page: number,
): Promise<{ ads: ParsedAutoScout24Ad[]; searchUrl: string; error?: string }> {
  const searchUrl = buildSearchUrlFromQuery(query, page);
  try {
    const html = await fetchAutoScout24Html(searchUrl);
    const ads = parseSearchHtml(html, { brand: query.brand, model: query.model });
    return { ads, searchUrl };
  } catch (error) {
    const message =
      error instanceof AutoScout24FetchError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Error desconocido";
    return { ads: [], searchUrl, error: message };
  }
}

export const autoScout24Provider: SourceProvider = {
  id: "autoscout24",
  name: "AutoScout24",
  kind: "marketplace",
  enabled: true,
  isMock: false,
  hostnames: ["autoscout24.es", "www.autoscout24.es", "autoscout24.com", "www.autoscout24.com"],

  async searchComparables(query: ComparableQuery): Promise<SourceSearchResult> {
    const fetchedAt = new Date().toISOString();
    const limit = query.limit ?? 24;
    const notes: string[] = [];
    const allAds: ParsedAutoScout24Ad[] = [];
    const seen = new Set<string>();
    let searchUrl = buildSearchUrlFromQuery(query, 1);

    for (const page of [1, 2]) {
      const result = await fetchSearchPage(query, page);
      searchUrl = result.searchUrl;
      if (result.error) {
        if (page === 1) {
          return emptyResult([`AutoScout24 no disponible: ${result.error}`]);
        }
        notes.push(`Página ${page}: ${result.error}`);
        continue;
      }
      if (result.ads.length === 0) {
        notes.push(`Página ${page} de AutoScout24 sin anuncios parseables.`);
      }
      for (const ad of result.ads) {
        if (seen.has(ad.id)) continue;
        seen.add(ad.id);
        allAds.push(ad);
      }
      if (page === 1) await sleep(PAGE_DELAY_MS);
    }

    const filtered = mapAndFilterAutoScout24Ads(allAds, query, {
      fetchedAt,
      limit,
    });

    if (filtered.listings.length === 0) {
      return emptyResult(
        [
          `No hay comparables útiles en AutoScout24 para ${query.brand} ${query.model} (~${query.year}). Búsqueda: ${searchUrl}`,
          ...notes,
        ],
        false,
      );
    }

    const documents = filtered.listings.slice(0, 8).map((listing) => listingToDocument(listing));

    return {
      listings: filtered.listings,
      documents,
      isDemo: false,
      fetchedAt,
      notes: [
        `${filtered.listings.length} anuncios de AutoScout24 (mercado España) para ${query.brand} ${query.model}.`,
        `Matching: ${filtered.matchStrictness} (${filtered.coreCount} core / ${filtered.mappedCount} mapeados).`,
        ...notes,
      ],
      connected: true,
    };
  },

  async extractListing(url: string): Promise<ListingExtractResult> {
    const fromUrl = parseListingUrl(url);
    if (!fromUrl?.id) {
      return {
        status: "invalid_url",
        source: "AutoScout24",
        message: "La URL no parece un anuncio de AutoScout24.",
        isDemo: false,
      };
    }

    const vehicle: Partial<Vehicle> = {
      listingUrl: fromUrl.url,
      brand: fromUrl.brand,
      model: fromUrl.model,
      version: fromUrl.version,
      fuel: fromUrl.fuel,
    };

    const detail = await fetchListingDetail(fromUrl.url);
    if (detail) {
      vehicle.advertisedPrice = detail.price;
      vehicle.mileage = detail.mileage;
      vehicle.power = detail.power;
      vehicle.year = detail.year;
      vehicle.fuel = detail.fuel ?? vehicle.fuel;
      vehicle.transmission = detail.transmission;
      vehicle.location = detail.location;
      if (detail.equipment?.length) vehicle.equipment = detail.equipment.join(", ");
    }

    const listing: Partial<VehicleListing> = {
      id: fromUrl.id,
      source: "autoscout24",
      url: fromUrl.url,
      title: detail?.title ?? [fromUrl.brand, fromUrl.model, fromUrl.version].filter(Boolean).join(" "),
      brand: fromUrl.brand,
      model: fromUrl.model,
      version: fromUrl.version,
      year: vehicle.year,
      mileage: vehicle.mileage,
      fuel: vehicle.fuel,
      power: vehicle.power,
      transmission: vehicle.transmission,
      price: vehicle.advertisedPrice,
      location: vehicle.location,
      isDemo: false,
      dataKind: "dynamic",
    };

    const filled = [
      vehicle.brand && "marca",
      vehicle.model && "modelo",
      vehicle.year && "año",
      vehicle.mileage && "km",
      vehicle.fuel && "combustible",
      vehicle.advertisedPrice && "precio",
      vehicle.power && "potencia",
    ].filter(Boolean);

    return {
      status: "extracted",
      source: "AutoScout24",
      vehicle,
      listing,
      message:
        filled.length > 0
          ? `Anuncio de AutoScout24 leído. Se rellenaron: ${filled.join(", ")}.`
          : "Se interpretó la URL de AutoScout24. Completa los campos que falten.",
      isDemo: false,
    };
  },
};
