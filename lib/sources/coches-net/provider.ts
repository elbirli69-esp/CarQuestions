import type { ComparableQuery } from "@/types/listing";
import type { ListingExtractResult, SourceProvider, SourceSearchResult } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";
import { CochesNetFetchError, fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import { mapAndFilterCochesNetAds } from "@/lib/sources/coches-net/map";
import { parseListingUrl, parseSearchHtml, type ParsedCochesNetAd } from "@/lib/sources/coches-net/parse";
import { buildSearchUrl } from "@/lib/sources/coches-net/slug";
import { listingToDocument } from "@/lib/rag/documents";

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

async function fetchSearchPages(
  query: Pick<ComparableQuery, "brand" | "model">,
  pages: number,
  startPage = 1,
): Promise<{ ads: ParsedCochesNetAd[]; searchUrl: string; notes: string[]; pagesFetched: number }> {
  const notes: string[] = [];
  const searchUrl = buildSearchUrl(query.brand, query.model, 1);
  const pageNumbers = Array.from({ length: pages }, (_, index) => startPage + index);

  const results = await Promise.all(
    pageNumbers.map(async (page) => {
      const url = buildSearchUrl(query.brand, query.model, page);
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

  if (startPage === 1 && results[0]?.error) {
    throw new CochesNetFetchError(results[0].error);
  }

  const allAds: ParsedCochesNetAd[] = [];
  const seen = new Set<string>();
  let pagesFetched = 0;
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

      try {
        // Primera pasada: 3 páginas (~24 cards SSR).
        let pagesFetched = 0;
        const first = await fetchSearchPages(query, 3, 1);
        pagesFetched += first.pagesFetched;
        let ads = first.ads;
        const notes = [...first.notes];

        let filtered = mapAndFilterCochesNetAds(ads, query, {
          fetchedAt,
          limit,
          yearWindow: 2,
        });

        // Si el núcleo (año+combustible) es corto, pedir 2 páginas más antes de relajar filtros.
        if (filtered.coreCount < 10 || filtered.listings.length < 8) {
          const more = await fetchSearchPages(query, 2, 4);
          pagesFetched += more.pagesFetched;
          notes.push(...more.notes);
          if (more.ads.length > 0) {
            ads = mergeAds(ads, more.ads);
            filtered = mapAndFilterCochesNetAds(ads, query, {
              fetchedAt,
              limit,
              yearWindow: 2,
            });
            notes.push(`Ampliación de búsqueda: +${more.ads.length} anuncios brutos (págs. 4–5).`);
          }
        }

        const { listings, matchStrictness, mappedCount, coreCount } = filtered;

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

      let matched: ParsedCochesNetAd | undefined;
      if (fromUrl.brand && fromUrl.model) {
        try {
          const first = await fetchSearchPages({ brand: fromUrl.brand, model: fromUrl.model }, 3, 1);
          let ads = first.ads;
          matched = ads.find((ad) => ad.id === fromUrl.id);
          if (!matched) {
            const more = await fetchSearchPages({ brand: fromUrl.brand, model: fromUrl.model }, 2, 4);
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
          // Seguimos con lo parseado del slug.
        }
      }

      if (matched) {
        vehicle.advertisedPrice = matched.price;
        vehicle.mileage = matched.mileage;
        vehicle.power = matched.power;
        vehicle.year = matched.year ?? vehicle.year;
        vehicle.fuel = matched.fuel ?? vehicle.fuel;
        vehicle.location = matched.location ?? vehicle.location;
        vehicle.version = matched.version ?? vehicle.version;
        vehicle.transmission = matched.transmission ?? vehicle.transmission;
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
      ].filter(Boolean);

      return {
        status: "extracted",
        source: "coches.net",
        listing: {
          id: fromUrl.id,
          source: "coches.net",
          url: fromUrl.url,
          title: matched?.title ?? fromUrl.title,
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
          isDemo: false,
          dataKind: "dynamic",
          fetchedAt: new Date().toISOString(),
        },
        vehicle,
        message: matched
          ? `Anuncio encontrado en coches.net. Se rellenaron: ${filled.join(", ")}.`
          : `Se interpretó la URL de coches.net (${filled.join(", ") || "datos parciales"}). Completa lo que falte: la ficha individual no siempre es scrapeable.`,
        isDemo: false,
      };
    },
  };
}

export const cochesNetProvider = createCochesNetProvider();
