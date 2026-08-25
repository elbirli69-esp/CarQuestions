import type { PlateLookupFieldKey, PlateLookupMissingKey } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";

const FIELD_LABELS: Record<PlateLookupFieldKey, string> = {
  registrationPlate: "matrícula",
  brand: "marca",
  model: "modelo",
  version: "versión",
  year: "año",
  fuel: "combustible",
  power: "CV",
  transmission: "cambio",
  bodyType: "carrocería",
  engineCode: "código motor",
  vin: "bastidor (VIN)",
};

const MISSING_LABELS: Record<PlateLookupMissingKey, string> = {
  mileage: "kilómetros",
  advertisedPrice: "precio del anuncio",
  listingUrl: "URL del anuncio",
  equipment: "equipamiento",
  generalCondition: "estado del coche",
};

const MISSING_HINTS: Record<PlateLookupMissingKey, string> = {
  mileage: "No figuran en el registro — indícalos o pega la URL del anuncio.",
  advertisedPrice: "No sale de la matrícula — escríbelo o pégalo desde el anuncio.",
  listingUrl: "Pega coches.net / AutoScout24 para km, precio y equipamiento.",
  equipment: "Solo en el anuncio o preguntando al vendedor.",
  generalCondition: "Revisa el anuncio o pregunta al vendedor.",
};

export function listFilledPlateFields(vehicle: Partial<Vehicle>): PlateLookupFieldKey[] {
  const filled: PlateLookupFieldKey[] = [];
  if (vehicle.registrationPlate?.trim()) filled.push("registrationPlate");
  if (vehicle.brand?.trim()) filled.push("brand");
  if (vehicle.model?.trim()) filled.push("model");
  if (vehicle.version?.trim()) filled.push("version");
  if (vehicle.year != null) filled.push("year");
  if (vehicle.fuel) filled.push("fuel");
  if (vehicle.power != null) filled.push("power");
  if (vehicle.transmission) filled.push("transmission");
  if (vehicle.bodyType) filled.push("bodyType");
  if (vehicle.engineCode?.trim()) filled.push("engineCode");
  if (vehicle.vin?.trim()) filled.push("vin");
  return filled;
}

export function listMissingAfterPlate(vehicle: Partial<Vehicle>): PlateLookupMissingKey[] {
  const missing: PlateLookupMissingKey[] = [];
  if (vehicle.mileage == null) missing.push("mileage");
  if (vehicle.advertisedPrice == null) missing.push("advertisedPrice");
  if (!vehicle.listingUrl?.trim()) missing.push("listingUrl");
  if (!vehicle.equipment?.trim()) missing.push("equipment");
  if (!vehicle.generalCondition) missing.push("generalCondition");
  return missing;
}

export function labelForPlateField(key: PlateLookupFieldKey): string {
  return FIELD_LABELS[key];
}

export function labelForMissingField(key: PlateLookupMissingKey): string {
  return MISSING_LABELS[key];
}

export function hintForMissingField(key: PlateLookupMissingKey): string {
  return MISSING_HINTS[key];
}

export function buildPlateLookupMessage(
  displayPlate: string,
  sources: string[],
  filled: PlateLookupFieldKey[],
  missing: PlateLookupMissingKey[],
  status: "extracted" | "partial",
): string {
  const filledLabels = filled.map(labelForPlateField);
  const sourceText =
    sources.length > 0 ? `Fuentes: ${sources.join(" + ")}.` : "Estimación local por matrícula.";

  if (status === "partial" && filled.length <= 2) {
    const partialFilled =
      filledLabels.length > 0 ? `Obtenido: ${filledLabels.join(", ")}.` : "";
    return `${sourceText} ${partialFilled} Configura RAPIDAPI_KEY (Matriculas.org) para marca y modelo automáticos.`;
  }

  const filledPart =
    status === "partial" && filledLabels.length > 0
      ? `Obtenido: ${filledLabels.join(", ")}.`
      : "";

  const missingSummary =
    missing.length > 0
      ? `Aún falta: ${missing.map(labelForMissingField).join(", ")}.`
      : "";

  return [sourceText, filledPart, missingSummary].filter(Boolean).join(" ");
}
