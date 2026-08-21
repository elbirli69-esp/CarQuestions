import type { ComparableQuery } from "@/types/listing";
import type {
  ListingExtractResult,
  SourceProvider,
  SourceSearchResult,
  StaticVehicleInfo,
} from "@/types/source";
import type { Vehicle } from "@/types/vehicle";

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

function mockMarketplace(
  id: string,
  name: string,
  hostnames: string[],
  count: number,
  offset: number,
): SourceProvider {
  return {
    id,
    name,
    kind: "marketplace",
    enabled: true,
    isMock: true,
    hostnames,
    async searchComparables(_query: ComparableQuery) {
      void count;
      void offset;
      return {
        listings: [],
        documents: [],
        isDemo: false,
        fetchedAt: new Date().toISOString(),
        notes: [`${name} aún no está conectado. No se incluyen anuncios simulados.`],
        connected: false,
      };
    },
    async extractListing(url: string): Promise<ListingExtractResult> {
      return {
        status: "provider_not_connected",
        source: name,
        message: `La extracción automática de ${name} no está conectada todavía. Completa el formulario a mano. URL recibida: ${url}`,
        isDemo: false,
      };
    },
  };
}

export const carsNetProvider = mockMarketplace(
  "coches.net",
  "coches.net",
  ["coches.net", "www.coches.net"],
  8,
  0,
);

export const autoScoutProvider = mockMarketplace(
  "autoscout24",
  "AutoScout24",
  ["autoscout24.es", "www.autoscout24.es", "autoscout24.com"],
  7,
  20,
);

export const wallapopProvider = mockMarketplace(
  "wallapop",
  "Wallapop",
  ["wallapop.com", "es.wallapop.com"],
  5,
  40,
);

export const milanunciosProvider = mockMarketplace(
  "milanuncios",
  "Milanuncios",
  ["milanuncios.com", "www.milanuncios.com"],
  5,
  60,
);

export const cochesComProvider = mockMarketplace(
  "coches.com",
  "coches.com",
  ["coches.com", "www.coches.com"],
  4,
  80,
);

export const autocasionProvider = mockMarketplace(
  "autocasion",
  "Autocasión",
  ["autocasion.com", "www.autocasion.com"],
  3,
  100,
);

export const manufacturerProvider: SourceProvider = {
  id: "manufacturer",
  name: "Ficha del fabricante",
  kind: "manufacturer",
  enabled: true,
  isMock: true,
  async searchComparables() {
    return emptyResult([
      "No hay API de fabricante conectada. La ficha técnica se limitará a los datos introducidos por el usuario.",
    ]);
  },
  async getStaticInfo(vehicle: Vehicle): Promise<StaticVehicleInfo> {
    return {
      source: "manufacturer",
      isDemo: false,
      fetchedAt: new Date().toISOString(),
      dataKind: "static",
      specs: {
        power: vehicle.power,
        fuel: vehicle.fuel,
        transmission: vehicle.transmission,
        bodyType: vehicle.bodyType,
      },
      notes: [
        "Las fichas oficiales de fabricante aún no están conectadas. No se completan especificaciones que el usuario no haya indicado.",
      ],
    };
  },
};

export const dgtProvider: SourceProvider = {
  id: "dgt",
  name: "DGT",
  kind: "official",
  enabled: true,
  isMock: true,
  async searchComparables() {
    return emptyResult([
      "DGT no está conectada. No se consultan matrículas, ITV ni datos oficiales en este MVP.",
    ]);
  },
};

export const genericWebProvider: SourceProvider = {
  id: "generic-web",
  name: "Extractor genérico de anuncios",
  kind: "generic",
  enabled: true,
  isMock: true,
  async searchComparables() {
    return emptyResult([
      "El extractor genérico no busca inventario. Servirá para analizar una URL de anuncio cuando se implemente de forma legal.",
    ]);
  },
  async extractListing(url: string): Promise<ListingExtractResult> {
    return {
      status: "unsupported_url",
      message: `No hay un conector activo para extraer ${url}. La arquitectura está preparada para añadirlo sin cambiar el resto de la app.`,
      isDemo: false,
    };
  },
};
