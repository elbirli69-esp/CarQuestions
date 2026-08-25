import { getServerEnv } from "@/lib/config/env";
import { estimateRegistrationYearFromPlate } from "@/lib/sources/plate/estimate-year";
import { formatSpanishPlateDisplay, normalizeSpanishPlate } from "@/lib/sources/plate/normalize";
import { lookupPlateViaOpenApi } from "@/lib/sources/plate/providers/openapi-automotive";
import { lookupPlateViaRapidApi } from "@/lib/sources/plate/providers/rapidapi-matriculas";
import { lookupPlateViaVerifik } from "@/lib/sources/plate/providers/verifik";
import type { PlateLookupResult } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";

function mergeVehicle(
  plate: string,
  patch: Partial<Vehicle>,
): Partial<Vehicle> {
  return {
    ...patch,
    registrationPlate: patch.registrationPlate ?? formatSpanishPlateDisplay(plate),
  };
}

function describeFilled(vehicle: Partial<Vehicle>): string[] {
  return [
    vehicle.brand && "marca",
    vehicle.model && "modelo",
    vehicle.year != null && "año",
    vehicle.fuel && "combustible",
    vehicle.power != null && "CV",
    vehicle.version && "versión",
  ].filter(Boolean) as string[];
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

  if (env.verifikApiToken) {
    providers.push({
      id: "verifik",
      name: "Verifik",
      run: () => lookupPlateViaVerifik(normalized, env.verifikApiToken!),
    });
  }
  if (env.openapiAutomotiveToken) {
    providers.push({
      id: "openapi-automotive",
      name: "OpenAPI Automotive",
      run: () =>
        lookupPlateViaOpenApi(
          normalized,
          env.openapiAutomotiveToken!,
          env.openapiAutomotiveBaseUrl,
        ),
    });
  }
  if (env.rapidApiKey) {
    providers.push({
      id: "rapidapi-matriculas",
      name: "Matrículas.org (RapidAPI)",
      run: () => lookupPlateViaRapidApi(normalized, env.rapidApiKey!),
    });
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const vehicle = await provider.run();
      if (!vehicle) continue;
      const merged = mergeVehicle(normalized, vehicle);
      const filled = describeFilled(merged);
      return {
        status: "extracted",
        source: provider.name,
        vehicle: merged,
        message:
          filled.length > 0
            ? `Datos de ${provider.name} para ${displayPlate}. Rellenados: ${filled.join(", ")}.`
            : `Consulta ${provider.name} completada para ${displayPlate}.`,
        isDemo: false,
        registrationPlate: displayPlate,
      };
    } catch (error) {
      errors.push(
        `${provider.name}: ${error instanceof Error ? error.message : "error desconocido"}`,
      );
    }
  }

  const estimatedYear = estimateRegistrationYearFromPlate(normalized);
  if (estimatedYear != null) {
    const vehicle = mergeVehicle(normalized, { year: estimatedYear });
    const apiHint =
      providers.length === 0
        ? "Configura VERIFIK_API_TOKEN, OPENAPI_AUTOMOTIVE_TOKEN o RAPIDAPI_KEY para obtener marca y modelo automáticos."
        : "No encontramos marca/modelo en las fuentes conectadas.";
    return {
      status: "partial",
      source: "estimación matrícula",
      vehicle,
      message: `${apiHint} Estimamos año de matriculación ~${estimatedYear} según la serie de la matrícula ${displayPlate}.`,
      isDemo: false,
      registrationPlate: displayPlate,
    };
  }

  if (providers.length === 0) {
    return {
      status: "provider_not_connected",
      message:
        `Matrícula ${displayPlate} reconocida, pero no hay API de consulta configurada. Añade VERIFIK_API_TOKEN, OPENAPI_AUTOMOTIVE_TOKEN o RAPIDAPI_KEY en el servidor, o completa el formulario manualmente.`,
      isDemo: false,
      registrationPlate: displayPlate,
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
  };
}
