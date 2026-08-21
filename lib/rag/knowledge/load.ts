import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeKnowledgeChunks } from "@/lib/rag/knowledge/merge";
import {
  assertUniqueChunkIds,
  knowledgeChunkSchema,
  parseKnowledgeCorpus,
  parseKnowledgeVectorIndex,
  type KnowledgeCorpus,
} from "@/lib/rag/knowledge/schema";
import type { KnowledgeChunk, KnowledgeVectorIndex } from "@/types/knowledge";

const KNOWLEDGE_DIR = join(process.cwd(), "data", "knowledge");

let cachedCorpus: KnowledgeCorpus | null = null;
let cachedIndex: KnowledgeVectorIndex | null = null;

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(KNOWLEDGE_DIR, relativePath), "utf8"));
}

function loadEnrichmentOverlays(): Partial<KnowledgeChunk>[] {
  try {
    const raw = readJson("enrichments.json") as { overlays?: unknown[] };
    if (!raw.overlays || !Array.isArray(raw.overlays)) return [];
    return raw.overlays.map((item) => knowledgeChunkSchema.partial().required({ id: true }).parse(item));
  } catch {
    return [];
  }
}

export function loadKnowledgeCorpus(): KnowledgeCorpus {
  if (cachedCorpus) return cachedCorpus;
  const corpus = parseKnowledgeCorpus(readJson("chunks.json"));
  const merged = {
    ...corpus,
    chunks: mergeKnowledgeChunks(corpus.chunks, loadEnrichmentOverlays()),
  };
  assertUniqueChunkIds(merged.chunks);
  cachedCorpus = merged;
  return merged;
}

export function loadKnowledgeChunks(): KnowledgeChunk[] {
  return loadKnowledgeCorpus().chunks;
}

export function loadKnowledgeVectorIndex(): KnowledgeVectorIndex | null {
  if (cachedIndex) return cachedIndex;
  try {
    cachedIndex = parseKnowledgeVectorIndex(readJson("vector-index.json"));
    return cachedIndex;
  } catch {
    return null;
  }
}

export function getKnowledgeChunkById(id: string): KnowledgeChunk | undefined {
  return loadKnowledgeChunks().find((chunk) => chunk.id === id);
}

export function resetKnowledgeCache(): void {
  cachedCorpus = null;
  cachedIndex = null;
}
