/**
 * Informe de curación del top 100 VO: fuente primaria por modelo.
 * Uso: npm run rag:vo-curation-report
 */
import { loadKnowledgeChunks } from "../lib/rag/knowledge/load";
import { VO_MODEL_PRIMARY_CURATION } from "../lib/rag/curation/vo-model-sources";
import { chunkMatchesBrand } from "../lib/rag/knowledge/filters";
import { normalizeKey } from "../lib/utils/math";

function chunkMatchesModel(
  chunk: { brands?: string[]; models?: string[] },
  brandSlug: string,
  modelSlug: string,
): boolean {
  if (!chunkMatchesBrand(chunk, brandSlug)) return false;
  if (!chunk.models?.length) return false;
  const modelKey = normalizeKey(modelSlug.replace(/-/g, " "));
  return chunk.models.some((m) => {
    const key = normalizeKey(m);
    return key === modelKey || key.includes(modelKey) || modelKey.includes(key);
  });
}

const chunks = loadKnowledgeChunks();
const chunkById = new Map(chunks.map((c) => [c.id, c]));

let ok = 0;
let missing = 0;
let generic = 0;

console.log("=== Curación primaria — top 100 VO España ===\n");

for (const row of VO_MODEL_PRIMARY_CURATION) {
  const chunk = chunkById.get(row.chunkId);
  if (!chunk) {
    console.log(`[MISSING CHUNK] #${row.rank} ${row.brandSlug} ${row.modelSlug} → ${row.chunkId}`);
    missing += 1;
    continue;
  }
  const matches = chunkMatchesModel(chunk, row.brandSlug, row.modelSlug);
  const isGeneric = chunk.externalRef?.includes("Patron documentado") ?? false;
  const curated = !chunk.isDemo && chunk.verificationLevel && chunk.sourceUrl;
  const sourceOk = chunk.sourceUrl === row.sourceUrl || chunk.externalRef === row.externalRef;

  if (!matches) {
    console.log(`[MODEL MISMATCH] #${row.rank} ${row.brandSlug} ${row.modelSlug} → ${row.chunkId}`);
  } else if (!curated) {
    console.log(`[NOT CURATED] #${row.rank} ${row.brandSlug} ${row.modelSlug} → ${row.chunkId}`);
    missing += 1;
  } else if (isGeneric) {
    console.log(`[GENERIC] #${row.rank} ${row.brandSlug} ${row.modelSlug} · ${chunk.verificationLevel} · ${chunk.sourceUrl}`);
    generic += 1;
  } else {
    ok += 1;
  }
}

console.log(`\nResumen: ${ok} OK · ${generic} genéricos · ${missing} problemas · ${VO_MODEL_PRIMARY_CURATION.length} modelos`);

if (missing > 0 || generic > 0) {
  process.exitCode = 1;
}
