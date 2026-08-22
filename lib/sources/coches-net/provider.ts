import type { ComparableQuery } from "@/types/listing";
import type { ListingExtractResult, SourceProvider, SourceSearchResult } from "@/types/source";
import { CochesNetFetchError, fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import { mapAndFilterCochesNetAds } from "@/lib/sources/coches-net/map";
import { parseListingUrl, parseSearchHtml } from "@/lib/sources/coches-net/parse";
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
  query: ComparableQuery,
  pages: number,
): Promise<{ ads: ReturnType<typeof parseSearchHtml>; searchUrl: string; notes: string[] }> {
  const notes: string[] = [];
  const allAds: ReturnType<typeof parseSearchHtml> = [];
  const seen = new Set<string>();
  const searchUrl = buildSearchUrl(query.brand, query.model, 1);

  for (let page = 1; page <= pages; page += 1) {
    const url = buildSearchUrl(query.brand, query.model, page);
    try {
      const html = await fetchCochesNetHtml(url);
      const ads = parseSearchHtml(html, { brand: query.brand, model: query.model });
      if (ads.length === 0) {
        notes.push(`Página ${page} de coches.net sin anuncios parseables.`);
        break;
      }
      for (const ad of ads) {
        if (seen.has(ad.id)) continue;
        seen.add(ad.id);
        allAds.push(ad);
      }
    } catch (error) {
      const message =
        error instanceof CochesNetFetchError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Error desconocido";
      if (page === 1) throw error;
      notes.push(`No se pudo leer la página ${page}: ${message}`);
      break;
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
      // coches.net solo hidrata ~8 cards por página en SSR; pedimos 2 páginas.
      const pages = 2;

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

        return {
          listings,
          documents: listings.map(listingToDocument),
          isDemo: false,
          fetchedAt,
          connected: true,
          notes: [
            `${listings.length} anuncios de coches.net (mercado España) para ${query.brand} ${query.model}.`,
            `Fuente: ${searchUrl}`,
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

      // Las fichas individuales a menudo bloquean scrapers; devolvemos lo extraíble de la URL
      // y pedimos completar el formulario. La valoración usa la búsqueda de comparables.
      return {
        status: "extracted",
        source: "coches.net",
        listing: {
          id: fromUrl.id,
          source: "coches.net",
          url: fromUrl.url ?? url,
          title: fromUrl.title ?? "Anuncio coches.net",
          isDemo: false,
          dataKind: "dynamic",
          fetchedAt: new Date().toISOString(),
        },
        vehicle: {
          listingUrl: fromUrl.url ?? url,
        },
        message:
          "Se reconoció el anuncio de coches.net. Completa marca, modelo, año, km y precio: la ficha detallada no se scrapea de forma fiable.",
        isDemo: false,
      };
    },
  };
}

export const cochesNetProvider = createCochesNetProvider();
