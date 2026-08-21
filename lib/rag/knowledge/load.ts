import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertUniqueChunkIds,
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

export function loadKnowledgeCorpus(): KnowledgeCorpus {
  if (cachedCorpus) return cachedCorpus;
  const corpus = parseKnowledgeCorpus(readJson("chunks.json"));
  assertUniqueChunkIds(corpus.chunks);
  cachedCorpus = corpus;
  return corpus;
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
