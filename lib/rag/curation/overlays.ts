import { readFileSync } from "node:fs";
import { join } from "node:path";
import { knowledgeChunkSchema } from "@/lib/rag/knowledge/schema";
import type { KnowledgeChunk } from "@/types/knowledge";

const CURATION_PATH = join(process.cwd(), "data", "knowledge", "curation.json");

export interface KnowledgeCurationFile {
  version: 1;
  updatedAt: string;
  overlays: Partial<KnowledgeChunk>[];
}

export function loadCurationOverlays(): Partial<KnowledgeChunk>[] {
  try {
    const raw = JSON.parse(readFileSync(CURATION_PATH, "utf8")) as KnowledgeCurationFile;
    if (!raw.overlays || !Array.isArray(raw.overlays)) return [];
    return raw.overlays.map((item) =>
      knowledgeChunkSchema.partial().required({ id: true }).parse(item),
    );
  } catch {
    return [];
  }
}
