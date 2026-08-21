import { FUEL_TYPES } from "@/types/vehicle";
import { KNOWLEDGE_CHUNK_TYPES, type KnowledgeChunk, type KnowledgeVectorIndex } from "@/types/knowledge";
import { z } from "zod";

const fuelSchema = z.enum(FUEL_TYPES);

export const knowledgeChunkSchema = z.object({
  id: z.string().min(1),
  type: z.enum(KNOWLEDGE_CHUNK_TYPES),
  brands: z.array(z.string().min(1)).min(1),
  models: z.array(z.string().min(1)).optional(),
  fuels: z.array(fuelSchema).optional(),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
  motorCodes: z.array(z.string().min(1)).optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]).optional(),
  appliesWhen: z.string().optional(),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  reliabilityScore: z.number().min(0).max(100).optional(),
  maintenanceInterval: z.string().optional(),
  estimatedCostEur: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  isDemo: z.boolean(),
});

export const knowledgeCorpusSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  chunks: z.array(knowledgeChunkSchema),
});

export const knowledgeVectorIndexSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal("tfidf"),
  builtAt: z.string(),
  documentCount: z.number().int(),
  vocabularySize: z.number().int(),
  idf: z.record(z.string(), z.number()),
  entries: z.array(
    z.object({
      chunkId: z.string(),
      vector: z.record(z.string(), z.number()),
    }),
  ),
});

export type KnowledgeCorpus = z.infer<typeof knowledgeCorpusSchema>;

export function parseKnowledgeCorpus(input: unknown): KnowledgeCorpus {
  return knowledgeCorpusSchema.parse(input);
}

export function parseKnowledgeVectorIndex(input: unknown): KnowledgeVectorIndex {
  return knowledgeVectorIndexSchema.parse(input);
}

export function assertUniqueChunkIds(chunks: KnowledgeChunk[]): void {
  const ids = new Set<string>();
  for (const chunk of chunks) {
    if (ids.has(chunk.id)) {
      throw new Error(`Duplicate knowledge chunk id: ${chunk.id}`);
    }
    ids.add(chunk.id);
  }
}
