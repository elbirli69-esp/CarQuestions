import { getServerEnv } from "@/lib/config/env";
import {
  buildPlateLookupMessage,
  listFilledPlateFields,
  listMissingAfterPlate,
} from "@/lib/sources/plate/field-report";
import { formatSpanishPlateDisplay, normalizeSpanishPlate } from "@/lib/sources/plate/normalize";
import { hasPlateIdentity, mergeVehiclePatches } from "@/lib/sources/plate/merge-vehicle";
import { lookupPlateLocally } from "@/lib/sources/plate/providers/local";
import { lookupPlateViaOpenApi } from "@/lib/sources/plate/providers/openapi-automotive";
import { lookupPlateViaRapidApi } from "@/lib/sources/plate/providers/rapidapi-matriculas";
import { lookupPlateViaVerifik } from "@/lib/sources/plate/providers/verifik";
import type { PlateLookupResult } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";

function mergeVehicle(plate: string, patch: Partial<Vehicle>): Partial<Vehicle> {
  return {
    ...patch,
    registrationPlate: patch.registrationPlate ?? formatSpanishPlateDisplay(plate),
  };
}

function buildSuccessResult(
  displayPlate: string,
  vehicle: Partial<Vehicle>,
  sources: string[],
  status: "extracted" | "partial",
): PlateLookupResult {
  const filledFields = listFilledPlateFields(vehicle);
  const missingFields = listMissingAfterPlate(vehicle);
  return {
    status,
    source: sources[0],
    sources,
    vehicle,
    filledFields,
    missingFields,
    message: buildPlateLookupMessage(displayPlate, sources, filledFields, missingFields, status),
    isDemo: false,
    registrationPlate: displayPlate,
  };
}

export async function lookupVehicleByPlate(rawPlate: string): Promise<PlateLookupResult> {
  const normalized = normalizeSpanishPlate(rawPlate);
  if (!normalized) {
    return {
      status: "invalid_plate",
      message:
        "Matrícula no válida. Formatos: 1234 BCD (europea) o M-1234-AB (antigua provincial).",
      isDemo: false,
    };
  }

  const env = getServerEnv();
  const displayPlate = formatSpanishPlateDisplay(normalized);

  let merged = mergeVehiclePatches(
    { registrationPlate: displayPlate },
    lookupPlateLocally(normalized),
  );
  const sources: string[] = ["estimación matrícula (gratis)"];

  const paidProviders: Array<{
    id: string;
    name: string;
    run: () => Promise<Partial<Vehicle> | null>;
  }> = [];

  if (env.platePaidProviders) {
    if (env.rapidApiKey) {
      paidProviders.push({
        id: "rapidapi-matriculas",
        name: "Matriculas.org",
        run: () => lookupPlateViaRapidApi(normalized, env.rapidApiKey!),
      });
    }
    if (env.openapiAutomotiveToken) {
      paidProviders.push({
        id: "openapi-automotive",
        name: "OpenAPI ES-car",
        run: () =>
          lookupPlateViaOpenApi(
            normalized,
            env.openapiAutomotiveToken!,
            env.openapiAutomotiveBaseUrl,
          ),
      });
    }
    if (env.verifikApiToken) {
      paidProviders.push({
        id: "verifik",
        name: "Verifik",
        run: () => lookupPlateViaVerifik(normalized, env.verifikApiToken!),
      });
    }
  }

  const errors: string[] = [];

  for (const provider of paidProviders) {
    try {
      const patch = await provider.run();
      if (!patch) continue;
      merged = mergeVehiclePatches(merged, mergeVehicle(normalized, patch));
      sources.push(provider.name);
    } catch (error) {
      errors.push(
        `${provider.name}: ${error instanceof Error ? error.message : "error desconocido"}`,
      );
    }
  }

  if (hasPlateIdentity(merged)) {
    const hasBrandModel = Boolean(merged.brand?.trim() && merged.model?.trim());
    const status: "extracted" | "partial" = hasBrandModel ? "extracted" : "partial";
    return buildSuccessResult(displayPlate, merged, sources, status);
  }

  if (errors.length > 0) {
    return {
      status: "not_found",
      message: `No se encontraron datos para ${displayPlate}. ${errors.join(" · ")}`,
      isDemo: false,
      registrationPlate: displayPlate,
      missingFields: listMissingAfterPlate(merged),
    };
  }

  return {
    status: "partial",
    message:
      `Matrícula ${displayPlate} reconocida, pero no pudimos estimar datos. Para marca, modelo, km y precio pega la URL del anuncio.`,
    isDemo: false,
    registrationPlate: displayPlate,
    vehicle: merged,
    filledFields: listFilledPlateFields(merged),
    missingFields: listMissingAfterPlate(merged),
    sources,
  };
}
