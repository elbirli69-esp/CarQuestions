import type { Vehicle } from "@/types/vehicle";

const MERGE_KEYS: Array<keyof Vehicle> = [
  "brand",
  "model",
  "version",
  "trimSlug",
  "year",
  "mileage",
  "fuel",
  "power",
  "transmission",
  "engineCode",
  "gearboxCode",
  "bodyType",
  "advertisedPrice",
  "location",
  "owners",
  "generalCondition",
  "maintenanceHistory",
  "accidents",
  "equipment",
  "extras",
  "itv",
  "serviceBook",
  "tires",
  "bodyCondition",
  "interiorCondition",
  "listingUrl",
  "description",
  "registrationPlate",
  "vin",
];

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && !value.trim()) return true;
  return false;
}

export function mergeVehiclePatches(
  base: Partial<Vehicle>,
  patch: Partial<Vehicle>,
): Partial<Vehicle> {
  const out: Partial<Vehicle> = { ...base };

  for (const key of MERGE_KEYS) {
    const patchValue = patch[key];
    if (isEmptyValue(patchValue)) continue;
    const current = out[key];
    if (!isEmptyValue(current)) continue;
    (out as Record<keyof Vehicle, Vehicle[keyof Vehicle] | undefined>)[key] = patchValue;
  }

  return out;
}

export function hasPlateIdentity(vehicle: Partial<Vehicle>): boolean {
  return Boolean(
    vehicle.brand?.trim() ||
      vehicle.model?.trim() ||
      vehicle.year != null ||
      vehicle.fuel ||
      vehicle.vin?.trim(),
  );
}
