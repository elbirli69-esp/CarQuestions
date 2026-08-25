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
  const brand = pickString(data, ["CarMake", "MakeDescription", "make"]);
  const model = pickString(data, ["CarModel", "ModelDescription", "model"]);
  const version = pickString(data, ["Version", "Description"]);
  const year = parseYearValue(
    pickString(data, ["RegistrationYear", "FirstRegistrationYear", "registrationYear"]),
  );
  const fuel = mapFuelLabel(pickString(data, ["FuelType", "Fuel", "fuelType"]));
  const power = pickNumber(data, ["PowerCV", "powerCV", "Power"]);

  if (!brand && !model && !year) return null;

  return {
    brand: brand ?? undefined,
    model: model ?? undefined,
    version: version ?? undefined,
    year,
    fuel,
    power: power != null ? Math.round(power) : undefined,
    registrationPlate: pickString(data, ["LicensePlate", "plate"]) ?? plate,
  };
}
