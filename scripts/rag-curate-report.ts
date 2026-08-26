/**
 * Backlog de curación: chunks demo ordenados por prioridad España y requisitos para quitar isDemo.
 * Uso: npm run rag:curate-report
 */
import trimsData from "../data/vehicle-trims.json";
import usedPriority from "../data/spain-used-market-priority.json";
import { suggestVerificationLevel, validateChunkCuration } from "../lib/rag/curation/policy";
import { loadKnowledgeChunks } from "../lib/rag/knowledge/load";
import type { KnowledgeChunk } from "../types/knowledge";
import type { VehicleTrimCatalog } from "../lib/vehicles/trims-types";
import { normalizeKey } from "../lib/utils/math";

const trimCatalog = trimsData as VehicleTrimCatalog;
const VO_CORE_MAX = 100;

const USED_RANK = new Map(
  (usedPriority.models ?? []).map((m) => [`${m.brandSlug}/${m.modelSlug}`, m.rank]),
);

function voRankForChunk(chunk: KnowledgeChunk): number | undefined {
  if (!chunk.models?.length) return undefined;
  let best: number | undefined;
  for (const entry of trimCatalog.entries) {
    const rank = entry.spainUsedMarketRank ?? USED_RANK.get(`${entry.brandSlug}/${entry.modelSlug}`);
    if (rank == null || rank > VO_CORE_MAX) continue;
    const modelKey = normalizeKey(entry.modelSlug.replace(/-/g, " "));
    const matches = chunk.models.some((m) => {
      const k = normalizeKey(m);
      return k === modelKey || k.includes(modelKey) || modelKey.includes(k);
    });
    if (matches && chunk.brands.some((b) => normalizeKey(b) === normalizeKey(entry.brandSlug))) {
      best = best == null ? rank : Math.min(best, rank);
    }
  }
  return best;
}

function curationBlockers(chunk: KnowledgeChunk): string[] {
  if (!chunk.isDemo) return [];
  const suggested = suggestVerificationLevel(chunk);
  const blockers: string[] = [];

  if (!chunk.sourceUrl?.trim()) {
    blockers.push("añadir sourceUrl https (Safety Gate, OEM, informe)");
  } else if (!suggested) {
    blockers.push("sourceUrl parece home de foro — enlazar hilo/TSB/documento");
  }

  blockers.push("overlay en data/knowledge/curation.json con isDemo=false, curatedAt, verificationLevel");
  if (suggested === "oem_recall" || suggested === "reliability_report") {
    blockers.push("externalRef (ID campaña o año informe)");
  }

  return blockers;
}

const chunks = loadKnowledgeChunks();
const demo = chunks.filter((c) => c.isDemo);
const curated = chunks.filter((c) => !c.isDemo);

console.log(`Corpus: ${chunks.length} · curados ${curated.length} · demo ${demo.length}`);
console.log("");

const ranked = demo
  .map((chunk) => ({
    chunk,
    voRank: voRankForChunk(chunk),
    type: chunk.type,
  }))
  .sort((a, b) => {
    const ar = a.voRank ?? 9999;
    const br = b.voRank ?? 9999;
    if (ar !== br) return ar - br;
    const typeOrder = { recall: 0, issue: 1, maintenance: 2, inspection: 3 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

console.log("=== Top 30 chunks demo — prioridad top 100 VO (recall/issue primero) ===");
for (const row of ranked.slice(0, 30)) {
  const { chunk, voRank } = row;
  const rankLabel = voRank != null ? `#${voRank} VO` : "sin rank VO";
  const suggested = suggestVerificationLevel(chunk);
  console.log(
    `[${chunk.type}] ${chunk.id} · ${rankLabel} · url=${chunk.sourceUrl ? "sí" : "no"} · sug=${suggested ?? "—"}`,
  );
  const blockers = curationBlockers(chunk);
  if (blockers.length) console.log(`  → ${blockers.join("; ")}`);
}

const invalidCurated = curated.flatMap((c) => validateChunkCuration(c));
if (invalidCurated.length) {
  console.log("\n=== Curados con errores de política ===");
  for (const err of invalidCurated) console.log(`- ${err.chunkId}: ${err.message}`);
}

console.log("\nVer data/knowledge/CURATION.md para el flujo completo.");
