export const FUEL_TYPES = [
  "diesel",
  "petrol",
  "hybrid",
  "plugin_hybrid",
  "electric",
  "lpg",
  "cng",
  "other",
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export const TRANSMISSION_TYPES = [
  "manual",
  "automatic",
  "semi_automatic",
] as const;

export type TransmissionType = (typeof TRANSMISSION_TYPES)[number];

export const BODY_TYPES = [
  "suv",
  "sedan",
  "hatchback",
  "estate",
  "coupe",
  "cabrio",
  "van",
  "pickup",
  "other",
] as const;

export type BodyType = (typeof BODY_TYPES)[number];

export const CONDITION_LEVELS = [
  "excellent",
  "good",
  "fair",
  "poor",
  "unknown",
] as const;

export type ConditionLevel = (typeof CONDITION_LEVELS)[number];

export const SELLER_TYPES = ["private", "dealer", "unknown"] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export interface Vehicle {
  id?: string;
  brand: string;
  model: string;
  version?: string;
  year: number;
  mileage: number;
  fuel: FuelType;
  power?: number;
  transmission?: TransmissionType;
  bodyType?: BodyType;
  advertisedPrice?: number;
  location?: string;
  owners?: number;
  generalCondition?: ConditionLevel;
  maintenanceHistory?: string;
  accidents?: string;
  equipment?: string;
  extras?: string;
  itv?: string;
  serviceBook?: boolean;
  tires?: string;
  bodyCondition?: ConditionLevel;
  interiorCondition?: ConditionLevel;
  listingUrl?: string;
  description?: string;
}

export type VehicleInput = Omit<Vehicle, "id">;
