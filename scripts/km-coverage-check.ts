import { loadKnowledgeChunks } from "../lib/rag/knowledge/load";
import spain from "../data/spain-market-priority.json";
import {
  chunkMatchesBrand,
  chunkMatchesModel,
} from "../lib/rag/knowledge/filters";
import { normalizeKey } from "../lib/utils/math";

function chunkMatchesCatalogModel(
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

const top = spain.models.filter((m) => m.rank <= 16);
const chunks = loadKnowledgeChunks();
const isIssue = (c: { type: string }) => c.type === "issue" || c.type === "recall";

for (const m of top) {
  const issues = chunks.filter(
    (c) => isIssue(c) && chunkMatchesCatalogModel(c, m.brandSlug, m.modelSlug),
  );
  const withKm = issues.filter((c) => c.typicalKmFrom != null || c.typicalKmTo != null);
  const pct = issues.length ? Math.round((100 * withKm.length) / issues.length) : 0;
  const status = pct === 0 ? "SIN_KM" : pct < 50 ? "BAJO" : "OK";
  console.log(
    `#${m.rank} ${m.brandSlug}/${m.modelSlug}: ${issues.length} issues, ${withKm.length} con km (${pct}%) [${status}]`,
  );
  for (const c of issues) {
    const km =
      c.typicalKmFrom != null ? `${c.typicalKmFrom}-${c.typicalKmTo ?? "?"}` : "sin km";
    console.log(`  - ${c.id} (${km})`);
  }
}
