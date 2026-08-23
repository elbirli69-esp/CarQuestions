import type { FuelType, Vehicle } from "@/types/vehicle";

/** Evidence hierarchy for claims shown to the user. */
export type EvidenceLevel = "A" | "B" | "C" | "D";

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  A: "Específico del vehículo",
  B: "Plataforma / motor compartido",
  C: "Segmento genérico",
  D: "Inferencia",
};

export type SourceClass =
  | "official"
  | "marketplace"
  | "manufacturer"
  | "government"
  | "technical"
  | "community"
  | "inference";

export const SOURCE_CLASS_LABELS: Record<SourceClass, string> = {
  official: "Datos oficiales",
  marketplace: "Mercado / anuncios",
  manufacturer: "Fabricante",
  government: "Administración",
  technical: "Conocimiento técnico",
  community: "Comunidad / foros",
  inference: "Inferencia CarQuestions",
};

export type FieldSource = "user" | "listing" | "catalog" | "inferred" | "unknown";
export type FieldConfidence = "high" | "medium" | "low" | "none";

export interface ProvenancedField<T> {
  value: T;
  source: FieldSource;
  confidence: FieldConfidence;
  verified: boolean;
}

export interface CanonicalVehicle {
  make: ProvenancedField<string>;
  model: ProvenancedField<string>;
  generation?: ProvenancedField<string>;
  trim?: ProvenancedField<string>;
  engine?: ProvenancedField<string>;
  engine_code?: ProvenancedField<string>;
  fuel_type: ProvenancedField<FuelType>;
  power_hp?: ProvenancedField<number>;
  transmission?: ProvenancedField<string>;
  drive?: ProvenancedField<string>;
  year: ProvenancedField<number>;
  mileage: ProvenancedField<number>;
  price?: ProvenancedField<number>;
  country: ProvenancedField<string>;
  source: ProvenancedField<string>;
  source_url?: ProvenancedField<string>;
}

function field<T>(
  value: T,
  source: FieldSource = "user",
  confidence: FieldConfidence = "high",
  verified = false,
): ProvenancedField<T> {
  return { value, source, confidence, verified };
}

/** Build a canonical vehicle view from the form/API input. */
export function toCanonicalVehicle(vehicle: Vehicle): CanonicalVehicle {
  return {
    make: field(vehicle.brand, "user", "high", false),
    model: field(vehicle.model, "user", "high", false),
    trim: vehicle.version ? field(vehicle.version, "user", "medium", false) : undefined,
    fuel_type: field(vehicle.fuel, "user", "high", false),
    power_hp: vehicle.power != null ? field(vehicle.power, "user", "medium", false) : undefined,
    transmission: vehicle.transmission
      ? field(vehicle.transmission, "user", "medium", false)
      : undefined,
    year: field(vehicle.year, "user", "high", false),
    mileage: field(vehicle.mileage, "user", "high", false),
    price:
      vehicle.advertisedPrice != null
        ? field(vehicle.advertisedPrice, "user", "medium", false)
        : undefined,
    country: field("ES", "inferred", "high", true),
    source: field(vehicle.listingUrl ? "listing+user" : "user", "user", "high", false),
    source_url: vehicle.listingUrl
      ? field(vehicle.listingUrl, "user", "medium", false)
      : undefined,
  };
}

/**
 * Classify a knowledge chunk's applicability for UI labelling.
 * Universal (*) chunks are at most level C — never "known issue of this model".
 */
export function classifyChunkEvidenceLevel(options: {
  brands: string[];
  models?: string[];
  motorCodes?: string[];
  isInference?: boolean;
}): EvidenceLevel {
  if (options.isInference) return "D";
  const universal = options.brands.some((b) => b.trim() === "*");
  if (universal) return "C";
  if (options.motorCodes && options.motorCodes.length > 0 && (!options.models || options.models.length === 0)) {
    return "B";
  }
  if (options.models && options.models.length > 0) return "A";
  return "B";
}
