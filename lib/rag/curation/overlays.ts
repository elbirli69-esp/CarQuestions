import { readFileSync } from "node:fs";
import { join } from "node:path";
import { knowledgeChunkSchema } from "@/lib/rag/knowledge/schema";
import type { KnowledgeChunk } from "@/types/knowledge";

const CURATION_PATH = join(process.cwd(), "data", "knowledge", "curation.json");
const VO_CURATION_PATH = join(process.cwd(), "data", "knowledge", "vo-model-curation.json");

export interface KnowledgeCurationFile {
  version: 1;
  updatedAt: string;
  overlays: Partial<KnowledgeChunk>[];
}

function parseOverlayFile(path: string): Partial<KnowledgeChunk>[] {
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as KnowledgeCurationFile;
    if (!raw.overlays || !Array.isArray(raw.overlays)) return [];
    return raw.overlays.map((item) =>
      knowledgeChunkSchema.partial().required({ id: true }).parse(item),
    );
  } catch {
    return [];
  }
}

export function loadManualCurationOverlays(): Partial<KnowledgeChunk>[] {
  const manual = parseOverlayFile(CURATION_PATH);
  const vo = parseOverlayFile(VO_CURATION_PATH);
  const byId = new Map<string, Partial<KnowledgeChunk>>();
  for (const item of manual) {
    if (item.id) byId.set(item.id, item);
  }
  for (const item of vo) {
    if (item.id) byId.set(item.id, { ...byId.get(item.id), ...item });
  }
  return [...byId.values()];
}

/** Overlays manuales (curation.json). Usar loadAllCurationOverlays en load.ts. */
export function loadCurationOverlays(): Partial<KnowledgeChunk>[] {
  return loadManualCurationOverlays();
}
