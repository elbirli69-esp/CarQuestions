import type { ComparableQuery } from "@/types/listing";
import type { ListingExtractResult, SourceProvider, SourceSearchResult } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";
import type { VehicleListing } from "@/types/listing";
import { fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import { fetchListingDetail } from "@/lib/sources/coches-net/fetch-listing-detail";
import { CochesNetFetchError } from "@/lib/sources/coches-net/errors";
import { mapAndFilterCochesNetAds } from "@/lib/sources/coches-net/map";
import { parseListingUrl, parseSearchHtml, type ParsedCochesNetAd } from "@/lib/sources/coches-net/parse";
import { buildSearchUrlFromQuery, buildSearchUrl } from "@/lib/sources/coches-net/slug";
import { listingToDocument } from "@/lib/rag/documents";

const PAGE_BATCH_SIZE = 2;
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

async function fetchPagesWithThrottle(
  query: ComparableQuery,
  pageNumbers: number[],
): Promise<{ ads: ParsedCochesNetAd[]; searchUrl: string; notes: string[]; pagesFetched: number }> {
  const notes: string[] = [];
  const searchUrl = buildSearchUrlFromQuery(query, 1);
  const allAds: ParsedCochesNetAd[] = [];
  const seen = new Set<string>();
  let pagesFetched = 0;

  for (let i = 0; i < pageNumbers.length; i += PAGE_BATCH_SIZE) {
    const batch = pageNumbers.slice(i, i + PAGE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (page) => {
        const url = buildSearchUrlFromQuery(query, page);
        try {
          const html = await fetchCochesNetHtml(url);
          const ads = parseSearchHtml(html, { brand: query.brand, model: query.model });
          return { page, ads, error: null as string | null };
        } catch (error) {
          const message =
            error instanceof CochesNetFetchError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Error desconocido";
          return { page, ads: [] as ParsedCochesNetAd[], error: message };
        }
      }),
    );

    if (pageNumbers[0] === batch[0] && results[0]?.error) {
      throw new CochesNetFetchError(results[0].error);
    }

    for (const result of results) {
      if (result.error) {
        notes.push(`No se pudo leer la página ${result.page}: ${result.error}`);
        continue;
      }
      pagesFetched += 1;
      if (result.ads.length === 0) {
        notes.push(`Página ${result.page} de coches.net sin anuncios parseables.`);
        continue;
      }
      for (const ad of result.ads) {
        if (seen.has(ad.id)) continue;
        seen.add(ad.id);
        allAds.push(ad);
      }
    }

    if (i + PAGE_BATCH_SIZE < pageNumbers.length) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return { ads: allAds, searchUrl, notes, pagesFetched };
}

function mergeAds(base: ParsedCochesNetAd[], extra: ParsedCochesNetAd[]): ParsedCochesNetAd[] {
  const seen = new Set(base.map((ad) => ad.id));
  const merged = [...base];
  for (const ad of extra) {
    if (seen.has(ad.id)) continue;
    seen.add(ad.id);
    merged.push(ad);
  }
  return merged;
}

async function enrichTopListingsWithDetail(listings: VehicleListing[], limit = 3): Promise<VehicleListing[]> {
  const top = listings.slice(0, limit);
  const enriched = await Promise.all(
    top.map(async (listing) => {
      if (!listing.url) return listing;
      try {
        const detail = await fetchListingDetail(listing.url);
        if (!detail) return listing;
        const description = detail.description?.slice(0, 2000);
        const equipment = detail.equipment ?? [];
        return {
          ...listing,
          equipment: equipment.length > 0 ? equipment : listing.equipment,
          publicationDate: detail.publicationDate ?? listing.publicationDate,
          images: detail.images ?? listing.images,
          rawData: {
            ...listing.rawData,
            description,
            daysOnMarket: detail.daysOnMarket,
            detailScraped: true,
          },
        };
      } catch {
        return listing;
      }
    }),
  );

  return [...enriched, ...listings.slice(limit)];
}

export function createCochesNetProvider(): SourceProvider {
  return {
    id: "coches.net",
    name: "coches.net",
    kind: "marketplace",
    enabled: true,
    isMock: false,
    hostnames: ["coches.net", "www.coches.net"],

    async searchComparables(query: ComparableQuery): Promise<SourceSearchResult> {
      const fetchedAt = new Date().toISOString();
      const limit = query.limit ?? 30;
      const filteredUrl = buildSearchUrlFromQuery(query, 1);

      try {
        let pagesFetched = 0;
        const first = await fetchPagesWithThrottle(query, [1, 2]);
        pagesFetched += first.pagesFetched;
        let ads = first.ads;
        const notes = [
          `URL filtrada: ${filteredUrl}`,
          ...first.notes,
        ];

        let filtered = mapAndFilterCochesNetAds(ads, query, {
          fetchedAt,
          limit,
          yearWindow: 2,
        });

        if (filtered.coreCount < 8 || filtered.listings.length < 8) {
          const more = await fetchPagesWithThrottle(query, [3, 4, 5, 6]);
          pagesFetched += more.pagesFetched;
          notes.push(...more.notes);
          if (more.ads.length > 0) {
            ads = mergeAds(ads, more.ads);
            filtered = mapAndFilterCochesNetAds(ads, query, {
              fetchedAt,
              limit,
              yearWindow: 2,
            });
            notes.push(`Ampliación de búsqueda: +${more.ads.length} anuncios brutos (págs. 3–6).`);
          }
        }

        let listings = filtered.listings;
        let matchStrictness = filtered.matchStrictness;
        let mappedCount = filtered.mappedCount;
        let coreCount = filtered.coreCount;

        if (listings.length === 0) {
          // Fallback: solo año en path (sin combustible) si la URL filtrada no devuelve datos.
          const fallbackQuery = { ...query, fuel: undefined };
          const fallbackUrl = buildSearchUrl(query.brand, query.model, 1, {
            year: query.year,
          });
          notes.push(`Reintento sin filtro combustible: ${fallbackUrl}`);
          const fb = await fetchPagesWithThrottle(fallbackQuery, [1, 2, 3]);
          pagesFetched += fb.pagesFetched;
          if (fb.ads.length > 0) {
            ads = mergeAds(ads, fb.ads);
            filtered = mapAndFilterCochesNetAds(ads, query, {
              fetchedAt,
              limit,
              yearWindow: 2,
            });
            listings = filtered.listings;
            matchStrictness = filtered.matchStrictness;
            mappedCount = filtered.mappedCount;
            coreCount = filtered.coreCount;
            notes.push(`Fallback añadió ${fb.ads.length} anuncios brutos.`);
          }
        }

        if (listings.length > 0) {
          listings = await enrichTopListingsWithDetail(listings, 3);
          const scraped = listings.filter((l) => l.rawData?.detailScraped).length;
          if (scraped > 0) {
            notes.push(`Fichas detalle scrapeadas para ${scraped} comparable(s) top.`);
          }
        }

        if (listings.length === 0) {
          return emptyResult([
            ...notes,
            `No hay comparables útiles en coches.net para ${query.brand} ${query.model} (~${query.year}). Búsqueda: ${first.searchUrl}`,
          ]);
        }

        const sampleNote =
          listings.length < 8
            ? `Muestra moderada (${listings.length} tras filtros de ${coreCount} núcleo / ${mappedCount} mapeados).`
            : `Muestra de ${listings.length} anuncios (núcleo año+combustible: ${coreCount}; brutos: ${ads.length}).`;
        const strictnessNote =
          matchStrictness === "strict"
            ? "Filtros estrechos (año, combustible, similitud)."
            : matchStrictness === "relaxed"
              ? "Filtros relajados: se amplió el pool para llegar a suficientes anuncios."
              : "Filtros amplios: la mediana puede mezclar años o versiones más lejanos.";

        return {
          listings,
          documents: listings.map(listingToDocument),
          isDemo: false,
          fetchedAt,
          connected: true,
          notes: [
            `${listings.length} anuncios de coches.net (mercado España) para ${query.brand} ${query.model}.`,
            sampleNote,
            strictnessNote,
            `Fuente: ${first.searchUrl}`,
            `Anuncios brutos leídos: ${ads.length} en ${pagesFetched} página(s).`,
            ...notes,
          ],
        };
      } catch (error) {
        const message =
          error instanceof CochesNetFetchError
            ? `${error.message}${error.status === 403 ? " (posible bloqueo antibot)" : ""}`
            : error instanceof Error
              ? error.message
              : "Error desconocido";
        return emptyResult([`coches.net no disponible: ${message}`]);
      }
    },

    async extractListing(url: string): Promise<ListingExtractResult> {
      const fromUrl = parseListingUrl(url);
      if (!fromUrl?.id) {
        return {
          status: "invalid_url",
          source: "coches.net",
          message: "La URL no parece un anuncio de coches.net.",
          isDemo: false,
        };
      }

      const vehicle: Partial<Vehicle> = {
        listingUrl: fromUrl.url,
        brand: fromUrl.brand,
        model: fromUrl.model,
        version: fromUrl.version,
        year: fromUrl.year,
        fuel: fromUrl.fuel,
        location: fromUrl.location,
      };

      let detailMessage = "";
      const detail = await fetchListingDetail(fromUrl.url);
      if (detail) {
        vehicle.advertisedPrice = detail.price ?? vehicle.advertisedPrice;
        vehicle.mileage = detail.mileage ?? vehicle.mileage;
        vehicle.power = detail.power ?? vehicle.power;
        vehicle.year = detail.year ?? vehicle.year;
        vehicle.fuel = detail.fuel ?? vehicle.fuel;
        vehicle.location = detail.location ?? vehicle.location;
        vehicle.transmission = detail.transmission ?? vehicle.transmission;
        if (detail.equipment?.length) {
          vehicle.equipment = detail.equipment.join(", ");
        }
        detailMessage = "Ficha individual scrapeada.";
      }

      let matched: ParsedCochesNetAd | undefined;
      if (fromUrl.brand && fromUrl.model && (!detail?.price || !detail?.mileage)) {
        try {
          const query: ComparableQuery = {
            brand: fromUrl.brand,
            model: fromUrl.model,
            year: fromUrl.year ?? vehicle.year ?? 2020,
            mileage: vehicle.mileage ?? 50000,
            fuel: vehicle.fuel,
          };
          const first = await fetchPagesWithThrottle(query, [1, 2, 3, 4]);
          let ads = first.ads;
          matched = ads.find((ad) => ad.id === fromUrl.id);
          if (!matched) {
            const more = await fetchPagesWithThrottle(query, [5, 6]);
            ads = mergeAds(ads, more.ads);
            matched = ads.find((ad) => ad.id === fromUrl.id);
          }
          if (!matched && fromUrl.year) {
            matched = ads.find(
              (ad) =>
                ad.year === fromUrl.year &&
                (!fromUrl.version ||
                  (ad.version &&
                    ad.version.toLowerCase().includes(fromUrl.version.toLowerCase().split(" ")[0] ?? ""))),
            );
          }
        } catch {
          // Seguimos con lo parseado del slug / ficha.
        }
      }

      if (matched) {
        vehicle.advertisedPrice = vehicle.advertisedPrice ?? matched.price;
        vehicle.mileage = vehicle.mileage ?? matched.mileage;
        vehicle.power = vehicle.power ?? matched.power;
        vehicle.year = vehicle.year ?? matched.year;
        vehicle.fuel = vehicle.fuel ?? matched.fuel;
        vehicle.location = vehicle.location ?? matched.location;
        vehicle.version = vehicle.version ?? matched.version;
        vehicle.transmission = vehicle.transmission ?? matched.transmission;
        if (!detailMessage) detailMessage = "Anuncio encontrado en resultados de búsqueda.";
      }

      const filled = [
        vehicle.brand && "marca",
        vehicle.model && "modelo",
        vehicle.year && "año",
        vehicle.fuel && "combustible",
        vehicle.mileage != null && "km",
        vehicle.advertisedPrice != null && "precio",
        vehicle.power != null && "CV",
        vehicle.transmission && "cambio",
        vehicle.equipment && "equipamiento",
      ].filter(Boolean);

      return {
        status: "extracted",
        source: "coches.net",
        listing: {
          id: fromUrl.id,
          source: "coches.net",
          url: fromUrl.url,
          title: detail?.title ?? matched?.title ?? fromUrl.title,
          brand: vehicle.brand ?? "",
          model: vehicle.model ?? "",
          version: vehicle.version,
          year: vehicle.year,
          mileage: vehicle.mileage,
          fuel: vehicle.fuel,
          power: vehicle.power,
          transmission: vehicle.transmission,
          price: vehicle.advertisedPrice,
          location: vehicle.location,
          equipment: detail?.equipment,
          isDemo: false,
          dataKind: "dynamic",
          fetchedAt: new Date().toISOString(),
        },
        vehicle,
        message:
          filled.length > 0
            ? `${detailMessage || "Datos de coches.net."} Se rellenaron: ${filled.join(", ")}.`
            : `Se interpretó la URL de coches.net. Completa los campos que falten.`,
        isDemo: false,
      };
    },
  };
}

export const cochesNetProvider = createCochesNetProvider();
