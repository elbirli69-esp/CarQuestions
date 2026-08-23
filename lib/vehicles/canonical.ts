import type { FieldProvenance, FieldSource } from "@/types/evidence";
import type { FuelType, TransmissionType, Vehicle, VehicleInput } from "@/types/vehicle";
import { inferFuelFromVersion } from "@/lib/vehicles/identity";

function field<T>(value: T, source: FieldSource, confidence: FieldProvenance<T>["confidence"], verified = false): FieldProvenance<T> {
  return { value, source, confidence, verified };
}

export interface CanonicalVehicle {
  make: FieldProvenance<string>;
  model: FieldProvenance<string>;
  generation?: FieldProvenance<string>;
  trim?: FieldProvenance<string>;
  engine?: FieldProvenance<string>;
  engine_code?: FieldProvenance<string>;
  fuel_type: FieldProvenance<FuelType>;
  power_hp?: FieldProvenance<number>;
  transmission?: FieldProvenance<TransmissionType>;
  drive?: FieldProvenance<string>;
  year: FieldProvenance<number>;
  mileage: FieldProvenance<number>;
  price?: FieldProvenance<number>;
  country: FieldProvenance<string>;
  source: FieldProvenance<string>;
  source_url?: FieldProvenance<string>;
}

export function toCanonicalVehicle(vehicle: Vehicle | VehicleInput): CanonicalVehicle {
  const fromListing = Boolean(vehicle.listingUrl);
  const source: FieldSource = fromListing ? "listing" : "user";
  const impliedFuel = vehicle.version ? inferFuelFromVersion(vehicle.version) : undefined;
  const fuelConfidence = impliedFuel && impliedFuel !== vehicle.fuel ? "low" : source === "listing" ? "high" : "medium";

  return {
    make: field(vehicle.brand, source, "high", source === "listing"),
    model: field(vehicle.model, source, "high", source === "listing"),
    trim: vehicle.version ? field(vehicle.version, source, vehicle.version.length > 2 ? "medium" : "low") : undefined,
    engine: vehicle.version ? field(vehicle.version, source, "low") : undefined,
    fuel_type: field(vehicle.fuel, source, fuelConfidence),
    power_hp: vehicle.power != null ? field(vehicle.power, source, "high") : undefined,
    transmission: vehicle.transmission
      ? field(vehicle.transmission, source, "medium")
      : undefined,
    year: field(vehicle.year, source, "high", source === "listing"),
    mileage: field(vehicle.mileage, source, "medium", source === "listing"),
    price: vehicle.advertisedPrice != null ? field(vehicle.advertisedPrice, source, "high") : undefined,
    country: field("ES", "inferred", "medium"),
    source: field(fromListing ? "listing" : "user", source, "high", true),
    source_url: vehicle.listingUrl ? field(vehicle.listingUrl, "listing", "high", true) : undefined,
  };
}
