import type { ComparableQuery } from "@/types/listing";
import type { ListingExtractResult, SourceProvider, SourceSearchResult } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";
import { fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import { CochesNetFetchError } from "@/lib/sources/coches-net/errors";
import { mapAndFilterCochesNetAds } from "@/lib/sources/coches-net/map";
import { parseListingUrl, parseSearchPage, type ParsedCochesNetAd } from "@/lib/sources/coches-net/parse";
import { buildSearchUrl, buildSearchUrlFromQuery } from "@/lib/sources/coches-net/slug";
import { listingToDocument } from "@/lib/rag/documents";

/** Peticiones simultáneas al portal. */
const PAGE_CONCURRENCY = 2;
const PAGE_DELAY_MS = 300;
/** Con ~35 anuncios por página, una o dos suelen bastar. */
const MAX_SEARCH_PAGES = 4;
/** Anuncios en el núcleo (año+combustible) a partir de los cuales dejamos de paginar. */
const TARGET_CORE_COUNT = 25;
/** Páginas a recorrer buscando un anuncio concreto por id. */
const MAX_EXTRACT_PAGES = 4;

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

function errorMessage(error: unknown): string {
  if (error instanceof CochesNetFetchError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

interface PageFetch {
  page: number;
  ads: ParsedCochesNetAd[];
  totalPages?: number;
  totalResults?: number;
  source?: "initial_props" | "cards";
  error: string | null;
}

async function fetchPage(query: ComparableQuery, page: number): Promise<PageFetch> {
  const url = buildSearchUrlFromQuery(query, page);
  try {
    const html = await fetchCochesNetHtml(url);
    const parsed = parseSearchPage(html, { brand: query.brand, model: query.model });
    return {
      page,
      ads: parsed.ads,
      totalPages: parsed.totalPages,
      totalResults: parsed.totalResults,
      source: parsed.source,
      error: null,
    };
  } catch (error) {
    return { page, ads: [], error: errorMessage(error) };
  }
}

interface PagesFetch {
  ads: ParsedCochesNetAd[];
  notes: string[];
  pagesFetched: number;
  totalPages?: number;
  totalResults?: number;
  source?: "initial_props" | "cards";
}

async function fetchPages(
  query: ComparableQuery,
  pages: number[],
  options: { throwOnFirstPageError?: boolean } = {},
): Promise<PagesFetch> {
  const notes: string[] = [];
  const ads: ParsedCochesNetAd[] = [];
  const seen = new Set<string>();
  let pagesFetched = 0;
  let totalPages: number | undefined;
  let totalResults: number | undefined;
  let source: "initial_props" | "cards" | undefined;

  for (let i = 0; i < pages.length; i += PAGE_CONCURRENCY) {
    const batch = pages.slice(i, i + PAGE_CONCURRENCY);
    const results = await Promise.all(batch.map((page) => fetchPage(query, page)));

    for (const result of results) {
      if (result.error) {
        if (options.throwOnFirstPageError && result.page === pages[0]) {
          throw new CochesNetFetchError(result.error);
        }
        notes.push(`No se pudo leer la página ${result.page}: ${result.error}`);
        continue;
      }
      pagesFetched += 1;
      totalPages = totalPages ?? result.totalPages;
      totalResults = totalResults ?? result.totalResults;
      source = source ?? result.source;

      if (result.ads.length === 0) {
        notes.push(`Página ${result.page} de coches.net sin anuncios parseables.`);
        continue;
      }
      for (const ad of result.ads) {
        if (seen.has(ad.id)) continue;
        seen.add(ad.id);
        ads.push(ad);
      }
    }

    if (i + PAGE_CONCURRENCY < pages.length) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return { ads, notes, pagesFetched, totalPages, totalResults, source };
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

function listingIdFromUrl(url: string): string | null {
  const match = url.match(/-(\d{6,})(?:-covo)?\.aspx/i);
  return match?.[1] ?? null;
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
        // La primera página del JSON de hidratación ya trae ~35 anuncios y los totales.
        const first = await fetchPages(query, [1], { throwOnFirstPageError: true });
        let ads = first.ads;
        let pagesFetched = first.pagesFetched;
        const notes = [`URL filtrada: ${filteredUrl}`, ...first.notes];

        if (first.totalResults != null) {
          notes.push(`coches.net declara ${first.totalResults} anuncios para este filtro.`);
        }
        if (first.source === "cards") {
          notes.push(
            "Sin JSON de hidratación en la respuesta: se usó el parser de cards (menos anuncios y menos campos).",
          );
        }

        let filtered = mapAndFilterCochesNetAds(ads, query, { fetchedAt, limit, yearWindow: 2 });

        // Paginar solo si el núcleo se queda corto y el portal tiene más páginas.
        const availablePages = Math.min(first.totalPages ?? 1, MAX_SEARCH_PAGES);
        if (filtered.coreCount < TARGET_CORE_COUNT && availablePages > 1) {
          const extraPages = Array.from({ length: availablePages - 1 }, (_, index) => index + 2);
          const more = await fetchPages(query, extraPages);
          pagesFetched += more.pagesFetched;
          notes.push(...more.notes);
          if (more.ads.length > 0) {
            ads = mergeAds(ads, more.ads);
            filtered = mapAndFilterCochesNetAds(ads, query, { fetchedAt, limit, yearWindow: 2 });
            notes.push(`Ampliación: +${more.ads.length} anuncios brutos (págs. 2–${availablePages}).`);
          }
        }

        let listings = filtered.listings;
        let { matchStrictness, mappedCount, coreCount } = filtered;

        // Último recurso: quitar el combustible del path por si el filtro deja el pool vacío.
        if (listings.length === 0) {
          const fallbackQuery = { ...query, fuel: undefined };
          const fallbackUrl = buildSearchUrl(query.brand, query.model, 1, { year: query.year });
          notes.push(`Reintento sin filtro de combustible: ${fallbackUrl}`);
          const fb = await fetchPages(fallbackQuery, [1, 2]);
          pagesFetched += fb.pagesFetched;
          notes.push(...fb.notes);
          if (fb.ads.length > 0) {
            ads = mergeAds(ads, fb.ads);
            filtered = mapAndFilterCochesNetAds(ads, query, { fetchedAt, limit, yearWindow: 2 });
            listings = filtered.listings;
            matchStrictness = filtered.matchStrictness;
            mappedCount = filtered.mappedCount;
            coreCount = filtered.coreCount;
            notes.push(`El reintento añadió ${fb.ads.length} anuncios brutos.`);
          }
        }

        if (listings.length === 0) {
          return emptyResult([
            ...notes,
            `No hay comparables útiles en coches.net para ${query.brand} ${query.model} (~${query.year}). Búsqueda: ${filteredUrl}`,
          ]);
        }

        const withPhotos = listings.filter((listing) => (listing.images?.length ?? 0) > 0).length;
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
            `Fuente: ${filteredUrl}`,
            `Anuncios brutos leídos: ${ads.length} en ${pagesFetched} página(s).`,
            withPhotos > 0 ? `${withPhotos} anuncios con fotos disponibles.` : null,
            ...notes,
          ].filter((note): note is string => Boolean(note)),
        };
      } catch (error) {
        const message =
          error instanceof CochesNetFetchError
            ? `${error.message}${error.status === 403 ? " (posible bloqueo antibot)" : ""}`
            : errorMessage(error);
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

      // La ficha individual está detrás de un challenge JS (405/403), así que
      // se busca el anuncio en los resultados, cuyo JSON trae los mismos datos.
      let matched: ParsedCochesNetAd | undefined;
      let photos: string[] | undefined;
      const notes: string[] = [];

      if (fromUrl.brand && fromUrl.model) {
        const searchQuery: ComparableQuery = {
          brand: fromUrl.brand,
          model: fromUrl.model,
          year: fromUrl.year ?? new Date().getFullYear() - 5,
          mileage: 0,
          fuel: fromUrl.fuel,
        };

        try {
          const first = await fetchPages(searchQuery, [1]);
          let ads = first.ads;
          matched = findAd(ads, fromUrl.id, fromUrl.url);

          const availablePages = Math.min(first.totalPages ?? 1, MAX_EXTRACT_PAGES);
          if (!matched && availablePages > 1) {
            const extraPages = Array.from({ length: availablePages - 1 }, (_, index) => index + 2);
            const more = await fetchPages(searchQuery, extraPages);
            ads = mergeAds(ads, more.ads);
            matched = findAd(ads, fromUrl.id, fromUrl.url);
          }

          // Aproximación por año + versión si el anuncio ya no está listado.
          if (!matched && fromUrl.year) {
            const versionToken = fromUrl.version?.toLowerCase().split(" ")[0];
            matched = ads.find(
              (ad) =>
                ad.year === fromUrl.year &&
                (!versionToken || ad.version?.toLowerCase().includes(versionToken)),
            );
            if (matched) {
              notes.push("No se encontró el anuncio exacto; se usó uno equivalente del mismo año y versión.");
            }
          }
        } catch (error) {
          notes.push(`No se pudo consultar coches.net: ${errorMessage(error)}`);
        }
      }

      if (matched) {
        vehicle.advertisedPrice = matched.price ?? vehicle.advertisedPrice;
        vehicle.mileage = matched.mileage ?? vehicle.mileage;
        vehicle.power = matched.power ?? vehicle.power;
        vehicle.year = matched.year ?? vehicle.year;
        vehicle.fuel = matched.fuel ?? vehicle.fuel;
        vehicle.location = matched.location ?? vehicle.location;
        vehicle.version = matched.version ?? vehicle.version;
        vehicle.transmission = matched.transmission ?? vehicle.transmission;
        photos = matched.photos;
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
      ].filter((item): item is string => Boolean(item));

      const message = matched
        ? `Datos leídos de coches.net. Se rellenaron: ${filled.join(", ")}.${
            photos?.length ? ` ${photos.length} fotos disponibles.` : ""
          }${notes.length ? ` ${notes.join(" ")}` : ""}`
        : `Se interpretó la URL de coches.net (${filled.join(", ") || "datos parciales"}). Completa lo que falte: el anuncio no aparece en los resultados de búsqueda.${
            notes.length ? ` ${notes.join(" ")}` : ""
          }`;

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
          images: photos,
          publicationDate: matched?.publicationDate,
          sellerType: matched?.sellerType,
          isDemo: false,
          dataKind: "dynamic",
          fetchedAt: new Date().toISOString(),
        },
        vehicle,
        message,
        isDemo: false,
      };
    },
  };
}

function findAd(
  ads: ParsedCochesNetAd[],
  id: string,
  url: string,
): ParsedCochesNetAd | undefined {
  const urlId = listingIdFromUrl(url);
  return ads.find((ad) => ad.id === id || (urlId != null && ad.id === urlId));
}

export const cochesNetProvider = createCochesNetProvider();
