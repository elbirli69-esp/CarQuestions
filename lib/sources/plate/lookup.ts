import { getServerEnv } from "@/lib/config/env";
import { estimateRegistrationYearFromPlate } from "@/lib/sources/plate/estimate-year";
import {
  buildPlateLookupMessage,
  listFilledPlateFields,
  listMissingAfterPlate,
} from "@/lib/sources/plate/field-report";
import { formatSpanishPlateDisplay, normalizeSpanishPlate } from "@/lib/sources/plate/normalize";
import { hasPlateIdentity, mergeVehiclePatches } from "@/lib/sources/plate/merge-vehicle";
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
  normalized: string,
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

  const providers: Array<{
    id: string;
    name: string;
    run: () => Promise<Partial<Vehicle> | null>;
  }> = [];

  // 1) Matriculas.org — más campos técnicos en España
  if (env.rapidApiKey) {
    providers.push({
      id: "rapidapi-matriculas",
      name: "Matriculas.org",
      run: () => lookupPlateViaRapidApi(normalized, env.rapidApiKey!),
    });
  }
  // 2) OpenAPI — versión comercial y CV
  if (env.openapiAutomotiveToken) {
    providers.push({
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
  // 3) Verifik — fallback simple
  if (env.verifikApiToken) {
    providers.push({
      id: "verifik",
      name: "Verifik",
      run: () => lookupPlateViaVerifik(normalized, env.verifikApiToken!),
    });
  }

  const errors: string[] = [];
  let merged: Partial<Vehicle> = { registrationPlate: displayPlate };
  const sources: string[] = [];

  for (const provider of providers) {
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
    return buildSuccessResult(normalized, displayPlate, merged, sources, status);
  }

  const estimatedYear = estimateRegistrationYearFromPlate(normalized);
  if (estimatedYear != null) {
    merged = mergeVehiclePatches(merged, { year: estimatedYear });
    const yearSources = sources.length > 0 ? sources : ["estimación serie matrícula"];
    return buildSuccessResult(normalized, displayPlate, merged, yearSources, "partial");
  }

  if (providers.length === 0) {
    return {
      status: "provider_not_connected",
      message:
        `Matrícula ${displayPlate} reconocida. Configura RAPIDAPI_KEY (Matriculas.org) u OPENAPI_AUTOMOTIVE_TOKEN en el servidor para datos automáticos.`,
      isDemo: false,
      registrationPlate: displayPlate,
      missingFields: listMissingAfterPlate(merged),
    };
  }

  return {
    status: "not_found",
    message:
      errors.length > 0
        ? `No se encontraron datos para ${displayPlate}. ${errors.join(" · ")}`
        : `No se encontraron datos para la matrícula ${displayPlate}.`,
    isDemo: false,
    registrationPlate: displayPlate,
    missingFields: listMissingAfterPlate(merged),
  };
}
