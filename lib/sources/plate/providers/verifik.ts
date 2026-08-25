import { mapFuelLabel, parseYearValue, pickString } from "@/lib/sources/plate/map-fields";
import type { Vehicle } from "@/types/vehicle";

export async function lookupPlateViaVerifik(
  plate: string,
  token: string,
): Promise<Partial<Vehicle> | null> {
  const response = await fetch(
    `https://api.verifik.co/v2/es/vehicle?plate=${encodeURIComponent(plate)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Verifik respondió ${response.status}`);
  }

  const payload = (await response.json()) as { data?: Record<string, unknown> };
  const data = payload.data;
  if (!data) return null;

  const brand = pickString(data, ["brand", "make", "marca"]);
  const model = pickString(data, ["model", "modelo"]);
  const year = parseYearValue(pickString(data, ["year", "registrationYear", "firstRegistrationYear"]));
  const fuel = mapFuelLabel(pickString(data, ["fuel", "fuelType", "vehicleType"]));

  if (!brand && !model && !year) return null;

  return {
    brand: brand ?? undefined,
    model: model ?? undefined,
    year,
    fuel,
    registrationPlate: pickString(data, ["plate", "matricula"]) ?? plate,
  };
}
