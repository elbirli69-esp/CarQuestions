import { inferTransmission } from "@/lib/sources/coches-net/parse";
import { mapBodyTypeLabel, mapTransmissionLabel } from "@/lib/sources/plate/map-body-type";
import { mapFuelLabel, parseYearValue, pickNumber, pickString } from "@/lib/sources/plate/map-fields";
import type { Vehicle } from "@/types/vehicle";

function pickEngineCode(source: Record<string, unknown>): string | undefined {
  const direct = pickString(source, [
    "AWN_code_moteur",
    "engineCode",
    "engine_code",
    "codigoMotor",
    "motorCode",
  ]);
  if (direct) {
    const parenthetical = direct.match(/\(([A-Za-z0-9]+)\)/);
    if (parenthetical?.[1]) return parenthetical[1].trim();
    const token = direct.split(/[\s|]/)[0]?.trim();
    if (token) return token.replace(/[()]/g, "");
  }

  const codes = source.AWN_codes_moteur;
  if (Array.isArray(codes) && codes.length > 0) {
    const first = String(codes[0]).trim();
    if (first) return first;
  }

  return undefined;
}

function parseRegistrationYear(source: Record<string, unknown>): number | undefined {
  const fromUsDate = pickString(source, ["AWN_date_mise_en_circulation_us", "registrationDate"]);
  if (fromUsDate) {
    const y = parseYearValue(fromUsDate);
    if (y) return y;
  }

  const fromEuDate = pickString(source, ["AWN_date_mise_en_circulation", "firstRegistrationDate"]);
  if (fromEuDate) {
    const y = parseYearValue(fromEuDate);
    if (y) return y;
  }

  return parseYearValue(
    pickString(source, [
      "year",
      "registrationYear",
      "RegistrationYear",
      "AWN_annee_de_debut_modele",
      "firstRegistrationYear",
    ]),
  );
}

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
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Matriculas.org (RapidAPI) respondió ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  if (payload.error === true) return null;

  const nested =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const brand = pickString(nested, ["AWN_marque", "brand", "make", "marca", "CarMake"]);
  const model = pickString(nested, [
    "AWN_modele_etude",
    "AWN_modele",
    "model",
    "modelo",
    "CarModel",
  ]);
  const version = pickString(nested, ["AWN_version", "AWN_label", "version", "Version", "description"]);
  const year = parseRegistrationYear(nested);
  const fuel = mapFuelLabel(
    pickString(nested, ["AWN_energie", "fuel", "fuelType", "FuelType", "combustible", "Fuel"]),
  );
  const power = pickNumber(nested, [
    "AWN_puissance_chevaux",
    "power",
    "powerCV",
    "PowerCV",
    "cv",
    "DynamicPower",
  ]);
  const vin = pickString(nested, ["AWN_VIN", "vin", "VIN", "VehicleIdentificationNumber"]);
  const engineCode = pickEngineCode(nested);
  const bodyType = mapBodyTypeLabel(
    pickString(nested, ["AWN_style_carrosserie", "bodyType", "vehicleType", "tipoVehiculo"]),
  );
  const transmission =
    mapTransmissionLabel(pickString(nested, ["AWN_type_embrayage", "transmission"])) ??
    inferTransmission(version ?? "", version);

  if (!brand && !model && !year && !vin) return null;

  return {
    brand: brand ?? undefined,
    model: model ?? undefined,
    version: version ?? undefined,
    year,
    fuel,
    power: power != null ? Math.round(power) : undefined,
    transmission,
    bodyType,
    engineCode,
    vin: vin?.toUpperCase(),
    registrationPlate:
      pickString(nested, ["AWN_immat", "plate", "matricula", "licensePlate", "plaque"]) ?? plate,
  };
}
