import type { KnowledgeChunk } from "@/types/knowledge";
import trimsData from "@/data/vehicle-trims.json";
import spainPriority from "@/data/spain-market-priority.json";
import spainUsedPriority from "@/data/spain-used-market-priority.json";
import { chunkAppliesToAllBrands, chunkIsModelSpecific, chunkMatchesBrand, chunkMatchesModel } from "@/lib/rag/knowledge/filters";
import { loadKnowledgeChunks } from "@/lib/rag/knowledge/load";
import type { VehicleTrimCatalog } from "@/lib/vehicles/trims-types";
import { normalizeKey } from "@/lib/utils/math";

const trimCatalog = trimsData as VehicleTrimCatalog;

const SPAIN_PRIORITY_RANK = new Map(
  (spainPriority.models ?? []).map((m) => [
    `${m.brandSlug}/${m.modelSlug}`,
    { rank: m.rank, registrations: m.registrations },
  ]),
);

const SPAIN_USED_PRIORITY_RANK = new Map(
  (spainUsedPriority.models ?? []).map((m) => [
    `${m.brandSlug}/${m.modelSlug}`,
    { rank: m.rank, voYearFrom: m.voYearFrom, voYearTo: m.voYearTo },
  ]),
);

/** Top matriculaciones nuevas (ANFAC). */
const SPAIN_NEW_CORE_MAX_RANK = 20;
/** Top 100 mercado VO España (curado). */
const SPAIN_VO_CORE_MAX_RANK = 100;

export interface ModelCoverageGap {
  brandSlug: string;
  modelSlug: string;
  displayName: string;
  trimCount: number;
  issueChunkCount: number;
  curatedIssueCount: number;
  platformChunkCount: number;
  priority: "high" | "medium" | "low";
  /** Ventas España (rank menor = más vendido). undefined = fuera del top prioritario. */
  spainMarketRank?: number;
  spainRegistrations?: number;
  /** Rank mercado VO España (top 100). */
  spainUsedMarketRank?: number;
  /** En top matriculaciones nuevas España. */
  spainCore: boolean;
  /** En top 100 mercado VO España. */
  voCore: boolean;
  suggestion: string;
}

export interface BrandCoverageSummary {
  brandSlug: string;
  issueChunks: number;
  curatedIssues: number;
  modelsInCatalog: number;
  modelsWithoutIssues: number;
  spainCoreModels: number;
  spainCoreGaps: number;
  voCoreModels: number;
  voCoreGaps: number;
}

export interface ModelKmCoverage {
  brandSlug: string;
  modelSlug: string;
  displayName: string;
  spainMarketRank?: number;
  spainUsedMarketRank?: number;
  spainCore: boolean;
  voCore: boolean;
  issueChunkCount: number;
  issuesWithKmCount: number;
  kmCoveragePct: number;
  status: "sin_km" | "bajo" | "ok";
  issueIdsWithoutKm: string[];
}

export interface CoverageGapReport {
  generatedAt: string;
  corpusChunks: number;
  catalogModels: number;
  spainCoreModels: number;
  voCoreModels: number;
  minIssuesThreshold: number;
  modelGaps: ModelCoverageGap[];
  brandSummaries: BrandCoverageSummary[];
  kmCoverage: ModelKmCoverage[];
  evalFailures: string[];
}

function isIssueOrRecall(chunk: KnowledgeChunk): boolean {
  return chunk.type === "issue" || chunk.type === "recall";
}

function brandIssueChunks(chunks: KnowledgeChunk[], brandSlug: string): KnowledgeChunk[] {
  return chunks.filter(
    (c) =>
      isIssueOrRecall(c) &&
      !chunkAppliesToAllBrands(c) &&
      chunkMatchesBrand(c, brandSlug),
  );
}

function chunkMatchesCatalogModel(chunk: KnowledgeChunk, brandSlug: string, modelSlug: string): boolean {
  if (!chunkMatchesBrand(chunk, brandSlug)) return false;
  if (!chunk.models?.length) return false;
  const modelKey = normalizeKey(modelSlug.replace(/-/g, " "));
  return chunk.models.some((m) => {
    const key = normalizeKey(m);
    return key === modelKey || key.includes(modelKey) || modelKey.includes(key);
  });
}

function chunkMatchesBrandPlatform(chunk: KnowledgeChunk, brandSlug: string): boolean {
  if (!isIssueOrRecall(chunk)) return false;
  if (!chunkMatchesBrand(chunk, brandSlug)) return false;
  return !chunkIsModelSpecific(chunk) && Boolean(chunk.motorCodes?.length);
}

function resolveMarketMeta(
  entry: {
    brandSlug: string;
    modelSlug: string;
    spainMarketRank?: number;
    spainRegistrations?: number;
    spainUsedMarketRank?: number;
    voYearFrom?: number;
    voYearTo?: number;
  },
): {
  spainMarketRank?: number;
  spainRegistrations?: number;
  spainUsedMarketRank?: number;
  spainCore: boolean;
  voCore: boolean;
} {
  const fromNew = SPAIN_PRIORITY_RANK.get(`${entry.brandSlug}/${entry.modelSlug}`);
  const fromUsed = SPAIN_USED_PRIORITY_RANK.get(`${entry.brandSlug}/${entry.modelSlug}`);
  const newRank = entry.spainMarketRank ?? fromNew?.rank;
  const usedRank = entry.spainUsedMarketRank ?? fromUsed?.rank;
  const registrations = entry.spainRegistrations ?? fromNew?.registrations;
  return {
    spainMarketRank: newRank,
    spainRegistrations: registrations,
    spainUsedMarketRank: usedRank,
    spainCore: newRank != null && newRank <= SPAIN_NEW_CORE_MAX_RANK,
    voCore: usedRank != null && usedRank <= SPAIN_VO_CORE_MAX_RANK,
  };
}

function gapSortKey(gap: ModelCoverageGap): number {
  const rank = gap.spainUsedMarketRank ?? gap.spainMarketRank ?? 9999;
  const priorityRank = gap.priority === "high" ? 0 : gap.priority === "medium" ? 1 : 2;
  return rank * 10 + priorityRank;
}

function buildKmCoverageForModel(
  chunks: KnowledgeChunk[],
  entry: { brandSlug: string; modelSlug: string; spainMarketRank?: number; spainRegistrations?: number },
): ModelKmCoverage {
  const market = resolveMarketMeta(entry);
  const issues = chunks.filter(
    (c) => isIssueOrRecall(c) && chunkMatchesCatalogModel(c, entry.brandSlug, entry.modelSlug),
  );
  const withKm = issues.filter((c) => c.typicalKmFrom != null || c.typicalKmTo != null);
  const pct = issues.length ? Math.round((100 * withKm.length) / issues.length) : 0;
  const status: ModelKmCoverage["status"] = pct === 0 ? "sin_km" : pct < 50 ? "bajo" : "ok";
  const withoutKm = issues.filter((c) => c.typicalKmFrom == null && c.typicalKmTo == null).map((c) => c.id);

  return {
    brandSlug: entry.brandSlug,
    modelSlug: entry.modelSlug,
    displayName: `${entry.brandSlug} ${entry.modelSlug}`,
    spainMarketRank: market.spainMarketRank,
    spainUsedMarketRank: market.spainUsedMarketRank,
    spainCore: market.spainCore,
    voCore: market.voCore,
    issueChunkCount: issues.length,
    issuesWithKmCount: withKm.length,
    kmCoveragePct: pct,
    status,
    issueIdsWithoutKm: withoutKm,
  };
}

export function buildCoverageGapReport(options?: {
  minIssuesPerModel?: number;
  evalFailureNames?: string[];
  spainCoreOnly?: boolean;
  voCoreOnly?: boolean;
}): CoverageGapReport {
  const minIssues = options?.minIssuesPerModel ?? 1;
  const chunks = loadKnowledgeChunks();
  const modelGaps: ModelCoverageGap[] = [];
  let spainCoreModels = 0;
  let voCoreModels = 0;

  for (const entry of trimCatalog.entries) {
    const market = resolveMarketMeta(entry);
    if (market.spainCore) spainCoreModels += 1;
    if (market.voCore) voCoreModels += 1;

    const issueChunks = chunks.filter((c) =>
      isIssueOrRecall(c) && chunkMatchesCatalogModel(c, entry.brandSlug, entry.modelSlug),
    );
    const curated = issueChunks.filter((c) => !c.isDemo);
    const platform = chunks.filter((c) => chunkMatchesBrandPlatform(c, entry.brandSlug));

    if (issueChunks.length >= minIssues) continue;
    if (options?.spainCoreOnly && !market.spainCore) continue;
    if (options?.voCoreOnly && !market.voCore) continue;

    const displayName = `${entry.brandSlug} ${entry.modelSlug}`;
    const priority: ModelCoverageGap["priority"] =
      market.voCore || market.spainCore || entry.trims.length >= 3 || issueChunks.length === 0
        ? "high"
        : "medium";

    let suggestion = "Añadir 1–2 chunks issue/recall con models incluyendo este modelo.";
    if (issueChunks.length === 0 && platform.length > 0) {
      suggestion = `Sin issues nivel A; hay ${platform.length} chunk(s) plataforma (nivel B) para la marca. Duplicar o enlazar por motorización.`;
    }
    if (curated.length === 0 && issueChunks.length > 0) {
      suggestion += " Todos los issues son demo — revisar y quitar isDemo.";
    }
    if (market.voCore) {
      suggestion = `[Top VO España #${market.spainUsedMarketRank}] ${suggestion}`;
    } else if (market.spainCore) {
      suggestion = `[Top matriculaciones #${market.spainMarketRank}] ${suggestion}`;
    }

    modelGaps.push({
      brandSlug: entry.brandSlug,
      modelSlug: entry.modelSlug,
      displayName,
      trimCount: entry.trims.length,
      issueChunkCount: issueChunks.length,
      curatedIssueCount: curated.length,
      platformChunkCount: platform.length,
      priority,
      spainMarketRank: market.spainMarketRank,
      spainRegistrations: market.spainRegistrations,
      spainUsedMarketRank: market.spainUsedMarketRank,
      spainCore: market.spainCore,
      voCore: market.voCore,
      suggestion,
    });
  }

  modelGaps.sort((a, b) => gapSortKey(a) - gapSortKey(b) || a.issueChunkCount - b.issueChunkCount);

  const brandSummaries: BrandCoverageSummary[] = trimCatalog.entries.reduce((acc, entry) => {
    let row = acc.find((b) => b.brandSlug === entry.brandSlug);
    if (!row) {
      const brandIssues = brandIssueChunks(chunks, entry.brandSlug);
      row = {
        brandSlug: entry.brandSlug,
        issueChunks: brandIssues.length,
        curatedIssues: brandIssues.filter((c) => !c.isDemo).length,
        modelsInCatalog: 0,
        modelsWithoutIssues: 0,
        spainCoreModels: 0,
        spainCoreGaps: 0,
        voCoreModels: 0,
        voCoreGaps: 0,
      };
      acc.push(row);
    }
    const market = resolveMarketMeta(entry);
    row.modelsInCatalog += 1;
    if (market.spainCore) row.spainCoreModels += 1;
    if (market.voCore) row.voCoreModels += 1;
    const modelIssues = chunks.filter((c) =>
      isIssueOrRecall(c) && chunkMatchesCatalogModel(c, entry.brandSlug, entry.modelSlug),
    );
    if (modelIssues.length < minIssues) {
      row.modelsWithoutIssues += 1;
      if (market.spainCore) row.spainCoreGaps += 1;
      if (market.voCore) row.voCoreGaps += 1;
    }
    return acc;
  }, [] as BrandCoverageSummary[]);

  brandSummaries.sort(
    (a, b) =>
      b.voCoreGaps - a.voCoreGaps ||
      b.spainCoreGaps - a.spainCoreGaps ||
      b.modelsWithoutIssues - a.modelsWithoutIssues,
  );

  const kmCoverage = trimCatalog.entries
    .map((entry) => buildKmCoverageForModel(chunks, entry))
    .filter((row) => row.voCore && row.issueChunkCount > 0)
    .sort(
      (a, b) =>
        (a.spainUsedMarketRank ?? a.spainMarketRank ?? 9999) -
        (b.spainUsedMarketRank ?? b.spainMarketRank ?? 9999) ||
        a.kmCoveragePct - b.kmCoveragePct,
    );

  return {
    generatedAt: new Date().toISOString(),
    corpusChunks: chunks.length,
    catalogModels: trimCatalog.entries.length,
    spainCoreModels,
    voCoreModels,
    minIssuesThreshold: minIssues,
    modelGaps,
    brandSummaries,
    kmCoverage,
    evalFailures: options?.evalFailureNames ?? [],
  };
}

export function formatCoverageGapReport(report: CoverageGapReport): string {
  const voGaps = report.modelGaps.filter((g) => g.voCore);
  const otherGaps = report.modelGaps.filter((g) => !g.voCore);

  const lines: string[] = [
    `Corpus: ${report.corpusChunks} chunks · Catálogo trims: ${report.catalogModels} modelos (${report.voCoreModels} top VO España · ${report.spainCoreModels} top matriculaciones)`,
    `Modelos con < ${report.minIssuesThreshold} issue/recall específicos: ${report.modelGaps.length} (${voGaps.length} en top 100 VO)`,
    "",
    "=== Prioridad VO — top 100 segunda mano sin cobertura A ===",
  ];

  if (voGaps.length === 0) {
    lines.push("(ninguno — top 100 VO cubierto a nivel mínimo)");
  } else {
    for (const gap of voGaps.slice(0, 40)) {
      const rankLabel =
        gap.spainUsedMarketRank != null ? `#${gap.spainUsedMarketRank} VO` : "?";
      lines.push(
        `[${gap.priority}] ${rankLabel} ${gap.displayName} · trims ${gap.trimCount} · issues ${gap.issueChunkCount} (curados ${gap.curatedIssueCount}) · plataforma ${gap.platformChunkCount}`,
      );
      lines.push(`  → ${gap.suggestion}`);
    }
    if (voGaps.length > 40) {
      lines.push(`  … y ${voGaps.length - 40} modelos más`);
    }
  }

  if (otherGaps.length > 0) {
    lines.push("", "=== Otros modelos del catálogo (fuera top 100 VO) ===");
    for (const gap of otherGaps.slice(0, 10)) {
      lines.push(
        `[${gap.priority}] ${gap.displayName} · trims ${gap.trimCount} · issues ${gap.issueChunkCount} (curados ${gap.curatedIssueCount})`,
      );
      lines.push(`  → ${gap.suggestion}`);
    }
  }

  lines.push("", "=== Resumen por marca (gaps top 100 VO) ===");
  for (const brand of report.brandSummaries
    .filter((b) => b.voCoreGaps > 0 || b.voCoreModels > 0)
    .slice(0, 20)) {
    lines.push(
      `${brand.brandSlug}: ${brand.issueChunks} issues (${brand.curatedIssues} curados) · VO gaps ${brand.voCoreGaps}/${brand.voCoreModels}`,
    );
  }

  if (report.evalFailures.length > 0) {
    lines.push("", "=== Fallos rag-eval (añadir corpus) ===");
    for (const name of report.evalFailures) {
      lines.push(`- ${name}`);
    }
  }

  const kmVo = report.kmCoverage.filter((k) => k.voCore);
  lines.push("", "=== Cobertura km (typicalKm) — top 100 VO España ===");
  if (kmVo.length === 0) {
    lines.push("(sin modelos top VO con issues)");
  } else {
    const sinKm = kmVo.filter((k) => k.status === "sin_km");
    const bajo = kmVo.filter((k) => k.status === "bajo");
    const ok = kmVo.filter((k) => k.status === "ok");
    lines.push(
      `OK ≥50%: ${ok.length} · BAJO <50%: ${bajo.length} · SIN_KM: ${sinKm.length} (de ${kmVo.length} modelos con issues)`,
    );
    for (const row of kmVo.slice(0, 30)) {
      const rank =
        row.spainUsedMarketRank != null
          ? `#${row.spainUsedMarketRank}`
          : row.spainMarketRank != null
            ? `#${row.spainMarketRank}`
            : "?";
      const label = row.status === "sin_km" ? "SIN_KM" : row.status === "bajo" ? "BAJO" : "OK";
      lines.push(
        `[${label}] ${rank} ${row.displayName}: ${row.issuesWithKmCount}/${row.issueChunkCount} issues con km (${row.kmCoveragePct}%)`,
      );
      if (row.issueIdsWithoutKm.length > 0 && row.status !== "ok") {
        lines.push(
          `  sin km: ${row.issueIdsWithoutKm.slice(0, 4).join(", ")}${row.issueIdsWithoutKm.length > 4 ? "…" : ""}`,
        );
      }
    }
    if (kmVo.length > 30) {
      lines.push(`  … y ${kmVo.length - 30} modelos más en el informe JSON`);
    }
  }

  return lines.join("\n");
}
