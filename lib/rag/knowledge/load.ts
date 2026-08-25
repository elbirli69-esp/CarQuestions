import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeKnowledgeChunks } from "@/lib/rag/knowledge/merge";
import { buildCatalogCurationOverlays } from "@/lib/rag/curation/catalog";
import { loadManualCurationOverlays } from "@/lib/rag/curation/overlays";
import {
  assertUniqueChunkIds,
  knowledgeChunkSchema,
  knowledgeCorpusSchema,
  parseKnowledgeCorpus,
  parseKnowledgeVectorIndex,
  type KnowledgeCorpus,
} from "@/lib/rag/knowledge/schema";
import type { KnowledgeChunk, KnowledgeVectorIndex } from "@/types/knowledge";

const KNOWLEDGE_DIR = join(process.cwd(), "data", "knowledge");
const PACKS_DIR = join(KNOWLEDGE_DIR, "packs");

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

function loadPackChunks(): KnowledgeChunk[] {
  let files: string[];
  try {
    files = readdirSync(PACKS_DIR)
      .filter((name) => name.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
  const chunks: KnowledgeChunk[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(PACKS_DIR, file), "utf8")) as {
      chunks?: unknown[];
    };
    if (!raw.chunks || !Array.isArray(raw.chunks)) continue;
    for (const [index, item] of raw.chunks.entries()) {
      try {
        chunks.push(knowledgeChunkSchema.parse(item));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid knowledge pack ${file} chunk[${index}]: ${detail}`);
      }
    }
  }
  return chunks;
}

export function loadKnowledgeCorpus(): KnowledgeCorpus {
  if (cachedCorpus) return cachedCorpus;
  const base = parseKnowledgeCorpus(readJson("chunks.json"));
  const packChunks = loadPackChunks();
  const combined = [...base.chunks, ...packChunks];
  assertUniqueChunkIds(combined);

  const enriched = mergeKnowledgeChunks(combined, loadEnrichmentOverlays());
  const withManual = mergeKnowledgeChunks(enriched, loadManualCurationOverlays());
  const catalogOverlays = buildCatalogCurationOverlays(withManual);
  const merged = knowledgeCorpusSchema.parse({
    version: 1 as const,
    updatedAt: new Date().toISOString(),
    chunks: mergeKnowledgeChunks(withManual, catalogOverlays),
  });
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
