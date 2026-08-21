import type {
  BodyType,
  FuelType,
  SellerType,
  TransmissionType,
} from "@/types/vehicle";

export interface VehicleListing {
  id: string;
  source: string;
  url?: string;
  title: string;
  brand: string;
  model: string;
  version?: string;
  year?: number;
  mileage?: number;
  fuel?: FuelType;
  transmission?: TransmissionType;
  power?: number;
  bodyType?: BodyType;
  price?: number;
  location?: string;
  equipment?: string[];
  sellerType?: SellerType;
  publicationDate?: string;
  images?: string[];
  rawData?: Record<string, unknown>;
  similarity?: number;
  isCompetitor?: boolean;
  isDemo: boolean;
  fetchedAt: string;
  dataKind: "dynamic";
}

export interface ComparableQuery {
  brand: string;
  model: string;
  version?: string;
  year: number;
  mileage: number;
  fuel?: FuelType;
  transmission?: TransmissionType;
  power?: number;
  bodyType?: BodyType;
  location?: string;
  limit?: number;
}
