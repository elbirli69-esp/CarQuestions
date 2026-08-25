import type { ComparableQuery, VehicleListing } from "@/types/listing";
import type { VehicleDocument } from "@/types/rag";
import type { Vehicle } from "@/types/vehicle";

export type SourceKind =
  | "marketplace"
  | "manufacturer"
  | "official"
  | "editorial"
  | "community"
  | "generic";

export interface SourceSearchResult {
  listings: VehicleListing[];
  documents: VehicleDocument[];
  isDemo: boolean;
  fetchedAt: string;
  notes: string[];
  connected: boolean;
}

export interface ListingExtractResult {
  status: "extracted" | "provider_not_connected" | "unsupported_url" | "invalid_url";
  source?: string;
  listing?: Partial<VehicleListing>;
  vehicle?: Partial<Vehicle>;
  message: string;
  isDemo: boolean;
}

export interface PlateLookupResult {
  status:
    | "extracted"
    | "partial"
    | "provider_not_connected"
    | "invalid_plate"
    | "not_found";
  source?: string;
  /** Proveedores que aportaron datos (puede ser varios tras merge). */
  sources?: string[];
  vehicle?: Partial<Vehicle>;
  message: string;
  isDemo: boolean;
  registrationPlate?: string;
  filledFields?: PlateLookupFieldKey[];
  missingFields?: PlateLookupMissingKey[];
}

export type PlateLookupFieldKey =
  | "registrationPlate"
  | "brand"
  | "model"
  | "version"
  | "year"
  | "fuel"
  | "power"
  | "transmission"
  | "bodyType"
  | "engineCode"
  | "vin";

export type PlateLookupMissingKey =
  | "mileage"
  | "advertisedPrice"
  | "listingUrl"
  | "equipment"
  | "generalCondition";

export interface StaticVehicleInfo {
  source: string;
  isDemo: boolean;
  fetchedAt: string;
  dataKind: "static";
  specs?: {
    power?: number;
    fuel?: string;
    transmission?: string;
    bodyType?: string;
    dimensions?: string;
  };
  notes: string[];
}

export interface SourceProvider {
  readonly id: string;
  readonly name: string;
  readonly kind: SourceKind;
  readonly enabled: boolean;
  readonly isMock: boolean;
  readonly hostnames?: string[];
  searchComparables(query: ComparableQuery): Promise<SourceSearchResult>;
  extractListing?(url: string): Promise<ListingExtractResult>;
  getStaticInfo?(vehicle: Vehicle): Promise<StaticVehicleInfo | null>;
}

export interface SourceCitation {
  id: string;
  name: string;
  kind: SourceKind;
  isMock: boolean;
  connected: boolean;
  usedFor: string[];
  listingCount: number;
  updatedAt?: string;
  note?: string;
}
