import type { ComparableQuery, VehicleListing } from "@/types/listing";
import type {
  ListingExtractResult,
  SourceCitation,
  SourceProvider,
  SourceSearchResult,
} from "@/types/source";
import {
  autoScoutProvider,
  autocasionProvider,
  cochesComProvider,
  dgtProvider,
  genericWebProvider,
  manufacturerProvider,
  milanunciosProvider,
  wallapopProvider,
} from "@/lib/sources/providers";
import { cochesNetProvider } from "@/lib/sources/coches-net/provider";

const providers: SourceProvider[] = [
  cochesNetProvider,
  autoScoutProvider,
  wallapopProvider,
  milanunciosProvider,
  cochesComProvider,
  autocasionProvider,
  manufacturerProvider,
  dgtProvider,
  genericWebProvider,
];

export function listSourceProviders(): SourceProvider[] {
  return providers.filter((provider) => provider.enabled);
}

export function getSourceProvider(id: string): SourceProvider | undefined {
  return providers.find((provider) => provider.id === id);
}

export function matchProviderByUrl(url: string): SourceProvider | undefined {
  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }

  return providers.find((provider) =>
    provider.hostnames?.some((host) => hostname === host.replace(/^www\./, "") || hostname.endsWith(host)),
  );
}

export async function searchAllComparables(query: ComparableQuery): Promise<SourceSearchResult> {
  const results = await Promise.all(
    listSourceProviders().map((provider) => provider.searchComparables(query)),
  );

  const listings = results.flatMap((result) => result.listings);
  const documents = results.flatMap((result) => result.documents);
  const notes = results.flatMap((result) => result.notes);
  const fetchedAt = new Date().toISOString();

  return {
    listings,
    documents,
    isDemo: results.every((result) => result.isDemo),
    fetchedAt,
    notes: Array.from(new Set(notes)),
    connected: results.some((result) => result.connected),
  };
}

export function toSourceCitations(
  listings: VehicleListing[],
  search: SourceSearchResult,
): SourceCitation[] {
  return listSourceProviders().map((provider) => {
    const listingCount = listings.filter((listing) => listing.source === provider.id).length;
    const notes = search.notes.filter((note) => note.toLowerCase().includes(provider.name.toLowerCase()));
    return {
      id: provider.id,
      name: provider.name,
      kind: provider.kind,
      isMock: provider.isMock,
      connected: provider.id === "coches.net" ? listingCount > 0 : !provider.isMock,
      usedFor: listingCount > 0 ? ["comparables", "precio"] : ["arquitectura"],
      listingCount,
      updatedAt: search.fetchedAt,
      note: notes[0] ?? (provider.isMock ? "Portal no conectado todavía." : undefined),
    };
  });
}

export async function extractListingFromUrl(url: string): Promise<ListingExtractResult> {
  const provider = matchProviderByUrl(url);
  if (!provider) {
    return genericWebProvider.extractListing?.(url) ?? {
      status: "unsupported_url",
      message: "No se reconoce el portal de esta URL.",
      isDemo: false,
    };
  }
  if (!provider.extractListing) {
    return {
      status: "provider_not_connected",
      source: provider.name,
      message: `${provider.name} no expone aún extracción de anuncios.`,
      isDemo: false,
    };
  }
  return provider.extractListing(url);
}
