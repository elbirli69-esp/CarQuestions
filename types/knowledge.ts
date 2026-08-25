import type { FuelType } from "@/types/vehicle";

export const KNOWLEDGE_CHUNK_TYPES = ["issue", "maintenance", "inspection", "recall"] as const;
export type KnowledgeChunkType = (typeof KNOWLEDGE_CHUNK_TYPES)[number];

/** Cómo se verificó el chunk antes de quitar isDemo. Ver data/knowledge/CURATION.md */
export const KNOWLEDGE_VERIFICATION_LEVELS = [
  "safety_gate_alert",
  "safety_gate_portal",
  "oem_recall",
  "oem_tsb",
  "regulatory",
  "reliability_report",
  "oem_manual",
  "technical_literature",
] as const;
export type KnowledgeVerificationLevel = (typeof KNOWLEDGE_VERIFICATION_LEVELS)[number];

export interface KnowledgeChunk {
  id: string;
  type: KnowledgeChunkType;
  brands: string[];
  models?: string[];
  fuels?: FuelType[];
  yearFrom?: number;
  yearTo?: number;
  motorCodes?: string[];
  title: string;
  content: string;
  severity?: "low" | "medium" | "high";
  appliesWhen?: string;
  source: string;
  sourceUrl?: string;
  tags?: string[];
  reliabilityScore?: number;
  maintenanceInterval?: string;
  estimatedCostEur?: { min?: number; max?: number };
  symptoms?: string[];
  askSeller?: string[];
  inspectSteps?: string[];
  typicalKmFrom?: number;
  typicalKmTo?: number;
  isDemo: boolean;
  /** Fecha ISO cuando un humano o proceso validó la fuente (requerido si isDemo=false). */
  curatedAt?: string;
  /** Tipo de evidencia que permite isDemo=false. */
  verificationLevel?: KnowledgeVerificationLevel;
  /** Referencia externa: nº alerta Safety Gate, campaña OEM, año informe ADAC/TÜV… */
  externalRef?: string;
}

export interface KnowledgeVectorEntry {
  chunkId: string;
  vector: Record<string, number>;
}

export interface KnowledgeVectorIndex {
  version: 1;
  algorithm: "tfidf";
  builtAt: string;
  documentCount: number;
  vocabularySize: number;
  idf: Record<string, number>;
  entries: KnowledgeVectorEntry[];
}
