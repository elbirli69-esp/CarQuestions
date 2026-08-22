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
): Promise<{ ads: ParsedCochesNetAd[]; searchUrl: string; notes: string[] }> {
  const notes: string[] = [];
  const searchUrl = buildSearchUrl(query.brand, query.model, 1);
  const pageNumbers = Array.from({ length: pages }, (_, index) => index + 1);

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

  if (results[0]?.error) {
    throw new CochesNetFetchError(results[0].error);
  }

  const allAds: ParsedCochesNetAd[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    if (result.error) {
      notes.push(`No se pudo leer la página ${result.page}: ${result.error}`);
      continue;
    }
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

  return { ads: allAds, searchUrl, notes };
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
      const limit = query.limit ?? 24;
      // ~8 cards SSR por página; 3 páginas en paralelo ≈ hasta ~24 anuncios brutos.
      const pages = 3;

      try {
        const { ads, searchUrl, notes } = await fetchSearchPages(query, pages);
        const listings = mapAndFilterCochesNetAds(ads, query, {
          fetchedAt,
          limit,
          yearWindow: 2,
        });

        if (listings.length === 0) {
          return emptyResult([
            ...notes,
            `No hay comparables útiles en coches.net para ${query.brand} ${query.model} (~${query.year}). Búsqueda: ${searchUrl}`,
          ]);
        }

        const sampleNote =
          listings.length < 8
            ? `Muestra moderada (${listings.length} anuncios tras filtros). La confianza del precio es orientativa.`
            : `Muestra de ${listings.length} anuncios tras filtrar año/combustible/versión.`;

        return {
          listings,
          documents: listings.map(listingToDocument),
          isDemo: false,
          fetchedAt,
          connected: true,
          notes: [
            `${listings.length} anuncios de coches.net (mercado España) para ${query.brand} ${query.model}.`,
            sampleNote,
            `Fuente: ${searchUrl}`,
            `Anuncios brutos leídos: ${ads.length} en ${pages} página(s).`,
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
          const { ads } = await fetchSearchPages({ brand: fromUrl.brand, model: fromUrl.model }, 3);
          matched = ads.find((ad) => ad.id === fromUrl.id);
          // Si no está en las primeras páginas, usar el anuncio más similar del slug (mismo año/versión).
          if (!matched && fromUrl.year) {
            matched = ads.find(
              (ad) =>
                ad.year === fromUrl.year &&
                (!fromUrl.version ||
                  (ad.version && ad.version.toLowerCase().includes(fromUrl.version.toLowerCase().split(" ")[0] ?? ""))),
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
      }

      const filled = [
        vehicle.brand && "marca",
        vehicle.model && "modelo",
        vehicle.year && "año",
        vehicle.fuel && "combustible",
        vehicle.mileage != null && "km",
        vehicle.advertisedPrice != null && "precio",
        vehicle.power != null && "CV",
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
