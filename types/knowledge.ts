import type { FuelType } from "@/types/vehicle";

export const KNOWLEDGE_CHUNK_TYPES = ["issue", "maintenance", "inspection", "recall"] as const;
export type KnowledgeChunkType = (typeof KNOWLEDGE_CHUNK_TYPES)[number];

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
