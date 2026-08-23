import type { FuelType } from "@/types/vehicle";

export type ValidationSeverity = "valid" | "suspicious" | "invalid";

export type FieldSource = "user" | "listing" | "catalog" | "inferred";

export type FieldConfidence = "high" | "medium" | "low";

export interface SourcedField<T> {
  value: T;
  source: FieldSource;
  confidence: FieldConfidence;
  verified?: boolean;
}

export type EvidenceLevel = "A" | "B" | "C" | "D";

export type SourceClassification =
  | "official"
  | "marketplace"
  | "manufacturer"
  | "government"
  | "technical"
  | "community"
  | "inference";

export interface ValidationIssue {
  code: string;
  severity: "warning" | "error";
  field?: string;
  message: string;
}

export interface VehicleValidationResult {
  severity: ValidationSeverity;
  isConsistent: boolean;
  canAnalyze: boolean;
  canUseModelSpecificKnowledge: boolean;
  issues: ValidationIssue[];
  catalogMatch: {
    brandFound: boolean;
    modelFound: boolean;
    brandSlug?: string;
    modelSlug?: string;
  };
}

export interface CanonicalVehicleIdentity {
  make: SourcedField<string>;
  model: SourcedField<string>;
  generation?: SourcedField<string>;
  trim?: SourcedField<string>;
  engine?: SourcedField<string>;
  fuelType: SourcedField<FuelType>;
  powerHp?: SourcedField<number>;
  year: SourcedField<number>;
  mileage: SourcedField<number>;
  advertisedPrice?: SourcedField<number>;
}

export type ConfidenceTier = "alta" | "media" | "baja" | "muy_baja";

export function confidenceTierFromScore(score: number): ConfidenceTier {
  if (score >= 70) return "alta";
  if (score >= 45) return "media";
  if (score >= 25) return "baja";
  return "muy_baja";
}

export const CONFIDENCE_TIER_LABELS: Record<ConfidenceTier, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  muy_baja: "Muy baja",
};
