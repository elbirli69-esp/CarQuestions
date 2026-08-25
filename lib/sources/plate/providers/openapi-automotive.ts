import { mapFuelLabel, parseYearValue, pickNumber, pickString } from "@/lib/sources/plate/map-fields";
import type { Vehicle } from "@/types/vehicle";

const DEFAULT_BASE = "https://automotive.openapi.com";

export async function lookupPlateViaOpenApi(
  plate: string,
  token: string,
  baseUrl = DEFAULT_BASE,
): Promise<Partial<Vehicle> | null> {
  const root = baseUrl.replace(/\/$/, "");
  const response = await fetch(`${root}/ES-car/${encodeURIComponent(plate)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`OpenAPI Automotive respondió ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const nested =
    data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const brand = pickString(nested, ["CarMake", "MakeDescription", "make"]);
  const model = pickString(nested, ["CarModel", "ModelDescription", "model"]);
  const version = pickString(nested, ["Version", "Description", "Variation"]);
  const year = parseYearValue(
    pickString(nested, ["RegistrationYear", "FirstRegistrationYear", "registrationYear"]),
  );
  const fuel = mapFuelLabel(pickString(nested, ["FuelType", "Fuel", "fuelType"]));
  const power = pickNumber(nested, ["PowerCV", "powerCV", "Power", "DynamicPower"]);

  if (!brand && !model && !year) return null;

  const vin = pickString(nested, ["Vin", "VIN", "VehicleIdentificationNumber"]);

  return {
    brand: brand ?? undefined,
    model: model ?? undefined,
    version: version ?? undefined,
    year,
    fuel,
    power: power != null ? Math.round(power) : undefined,
    registrationPlate: pickString(nested, ["LicensePlate", "plate"]) ?? plate,
    vin: vin?.toUpperCase(),
  };
}
