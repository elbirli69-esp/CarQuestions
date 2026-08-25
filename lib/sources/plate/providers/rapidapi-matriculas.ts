import { mapFuelLabel, parseYearValue, pickNumber, pickString } from "@/lib/sources/plate/map-fields";
import type { Vehicle } from "@/types/vehicle";

export async function lookupPlateViaRapidApi(
  plate: string,
  apiKey: string,
): Promise<Partial<Vehicle> | null> {
  const response = await fetch(
    `https://api-license-plate.p.rapidapi.com/es?plate=${encodeURIComponent(plate)}`,
    {
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "api-license-plate.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`RapidAPI matrículas respondió ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const nested =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const brand = pickString(nested, ["brand", "make", "marca", "CarMake"]);
  const model = pickString(nested, ["model", "modelo", "CarModel"]);
  const version = pickString(nested, ["version", "Version", "description"]);
  const year = parseYearValue(
    pickString(nested, ["year", "registrationYear", "RegistrationYear", "firstRegistrationYear"]),
  );
  const fuel = mapFuelLabel(
    pickString(nested, ["fuel", "fuelType", "FuelType", "combustible"]),
  );
  const power = pickNumber(nested, ["power", "powerCV", "PowerCV", "cv"]);

  if (!brand && !model && !year) return null;

  return {
    brand: brand ?? undefined,
    model: model ?? undefined,
    version: version ?? undefined,
    year,
    fuel,
    power: power != null ? Math.round(power) : undefined,
    registrationPlate: pickString(nested, ["plate", "matricula", "licensePlate"]) ?? plate,
  };
}
