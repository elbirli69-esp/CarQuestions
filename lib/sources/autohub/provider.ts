import type { ComparableQuery } from "@/types/listing";
import type { SourceProvider, SourceSearchResult } from "@/types/source";
import { AutoHubApiError, autohubGet } from "@/lib/sources/autohub/client";
import { mapAutoHubListings, normalizeAutoHubMake } from "@/lib/sources/autohub/map";
import { getServerEnv } from "@/lib/config/env";
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

export function createAutoHubProvider(): SourceProvider {
  return {
    id: "autohub",
    name: "AutoHub",
    kind: "marketplace",
    get enabled() {
      return Boolean(getServerEnv().autohubRapidApiKey);
    },
    get isMock() {
      return !this.enabled;
    },

    async searchComparables(query: ComparableQuery): Promise<SourceSearchResult> {
      const env = getServerEnv();
      const apiKey = env.autohubRapidApiKey;
      if (!apiKey) {
        return emptyResult([
          "AutoHub no está configurado. Añade RAPIDAPI_KEY o AUTOHUB_RAPIDAPI_KEY (plan gratuito en RapidAPI).",
        ]);
      }

      const fetchedAt = new Date().toISOString();
      const limit = query.limit ?? 24;

      try {
        const payload = await autohubGet<unknown>(
          {
            apiKey,
            baseUrl: env.autohubApiBaseUrl,
            host: env.autohubRapidApiHost,
          },
          "/v1/vehicles/for-sale",
          {
            year: query.year,
            make: normalizeAutoHubMake(query.brand),
            model: query.model,
            trim: query.version,
            zipcode: env.autohubZipcode,
            search_radius: env.autohubSearchRadius,
            limit,
          },
        );

        const listings = mapAutoHubListings(payload, query, {
          fetchedAt,
          usdToEur: env.autohubUsdToEur,
          limit,
        });

        return {
          listings,
          documents: listings.map(listingToDocument),
          isDemo: false,
          fetchedAt,
          connected: listings.length > 0,
          notes:
            listings.length > 0
              ? [
                  `${listings.length} anuncios reales de AutoHub (mercado EE. UU., KBB). Precios convertidos de USD a EUR (${env.autohubUsdToEur}). Referencia geográfica: ZIP ${env.autohubZipcode}.`,
                ]
              : ["AutoHub no devolvió anuncios comparables para esta búsqueda."],
        };
      } catch (error) {
        const message =
          error instanceof AutoHubApiError
            ? `${error.message}${error.status === 403 ? " (revisa la suscripción gratuita en RapidAPI)" : ""}`
            : error instanceof Error
              ? error.message
              : "Error desconocido";

        return emptyResult([`AutoHub no disponible: ${message}`]);
      }
    },
  };
}

export const autoHubProvider = createAutoHubProvider();
