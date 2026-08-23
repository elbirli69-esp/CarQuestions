export const EVIDENCE_LEVELS = ["A", "B", "C", "D"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  A: "Específico del vehículo",
  B: "Plataforma o motor compartido",
  C: "Conocimiento de segmento",
  D: "Inferencia",
};

export const CLAIM_SOURCE_KINDS = [
  "official",
  "marketplace",
  "manufacturer",
  "government",
  "technical",
  "community",
  "inference",
] as const;
export type ClaimSourceKind = (typeof CLAIM_SOURCE_KINDS)[number];

export const CLAIM_SOURCE_LABELS: Record<ClaimSourceKind, string> = {
  official: "Dato oficial",
  marketplace: "Dato observado (anuncios)",
  manufacturer: "Fabricante",
  government: "Administración",
  technical: "Conocimiento técnico",
  community: "Comunidad / foros",
  inference: "Inferencia de CarQuestions",
};

export const FIELD_SOURCES = ["user", "listing", "catalog", "inferred"] as const;
export type FieldSource = (typeof FIELD_SOURCES)[number];

export const FIELD_CONFIDENCE = ["high", "medium", "low"] as const;
export type FieldConfidence = (typeof FIELD_CONFIDENCE)[number];

export interface FieldProvenance<T> {
  value: T;
  source: FieldSource;
  confidence: FieldConfidence;
  verified: boolean;
}

export const CONSISTENCY_STATUSES = ["valid", "suspicious", "invalid"] as const;
export type ConsistencyStatus = (typeof CONSISTENCY_STATUSES)[number];

export interface ConsistencyIssue {
  code: string;
  field: string;
  status: Exclude<ConsistencyStatus, "valid">;
  message: string;
  relatedFields: string[];
}

export interface ConsistencyReport {
  status: ConsistencyStatus;
  issues: ConsistencyIssue[];
  /** Fields that must not be used for RAG / market identity. */
  discardedFields: string[];
  summary: string;
}

export const CONFIDENCE_BANDS = ["alta", "media", "baja", "muy_baja"] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];
