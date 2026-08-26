import type { KnowledgeChunk } from "@/types/knowledge";
import trimsData from "@/data/vehicle-trims.json";
import spainPriority from "@/data/spain-market-priority.json";
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

const SPAIN_CORE_MAX_RANK = 20;

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
  spainCore: boolean;
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
}

export interface ModelKmCoverage {
  brandSlug: string;
  modelSlug: string;
  displayName: string;
  spainMarketRank?: number;
  spainCore: boolean;
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

function resolveSpainMeta(
  entry: { brandSlug: string; modelSlug: string; spainMarketRank?: number; spainRegistrations?: number },
): { spainMarketRank?: number; spainRegistrations?: number; spainCore: boolean } {
  const fromEntry = entry.spainMarketRank;
  const fromFile = SPAIN_PRIORITY_RANK.get(`${entry.brandSlug}/${entry.modelSlug}`);
  const rank = fromEntry ?? fromFile?.rank;
  const registrations = entry.spainRegistrations ?? fromFile?.registrations;
  return {
    spainMarketRank: rank,
    spainRegistrations: registrations,
    spainCore: rank != null && rank <= SPAIN_CORE_MAX_RANK,
  };
}

function gapSortKey(gap: ModelCoverageGap): number {
  const rank = gap.spainMarketRank ?? 9999;
  const priorityRank = gap.priority === "high" ? 0 : gap.priority === "medium" ? 1 : 2;
  return rank * 10 + priorityRank;
}

function buildKmCoverageForModel(
  chunks: KnowledgeChunk[],
  entry: { brandSlug: string; modelSlug: string; spainMarketRank?: number; spainRegistrations?: number },
): ModelKmCoverage {
  const spain = resolveSpainMeta(entry);
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
    spainMarketRank: spain.spainMarketRank,
    spainCore: spain.spainCore,
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
}): CoverageGapReport {
  const minIssues = options?.minIssuesPerModel ?? 1;
  const chunks = loadKnowledgeChunks();
  const modelGaps: ModelCoverageGap[] = [];
  let spainCoreModels = 0;

  for (const entry of trimCatalog.entries) {
    const spain = resolveSpainMeta(entry);
    if (spain.spainCore) spainCoreModels += 1;

    const issueChunks = chunks.filter((c) =>
      isIssueOrRecall(c) && chunkMatchesCatalogModel(c, entry.brandSlug, entry.modelSlug),
    );
    const curated = issueChunks.filter((c) => !c.isDemo);
    const platform = chunks.filter((c) => chunkMatchesBrandPlatform(c, entry.brandSlug));

    if (issueChunks.length >= minIssues) continue;
    if (options?.spainCoreOnly && !spain.spainCore) continue;

    const displayName = `${entry.brandSlug} ${entry.modelSlug}`;
    const priority: ModelCoverageGap["priority"] =
      spain.spainCore || entry.trims.length >= 3 || issueChunks.length === 0 ? "high" : "medium";

    let suggestion = "Añadir 1–2 chunks issue/recall con models incluyendo este modelo.";
    if (issueChunks.length === 0 && platform.length > 0) {
      suggestion = `Sin issues nivel A; hay ${platform.length} chunk(s) plataforma (nivel B) para la marca. Duplicar o enlazar por motorización.`;
    }
    if (curated.length === 0 && issueChunks.length > 0) {
      suggestion += " Todos los issues son demo — revisar y quitar isDemo.";
    }
    if (spain.spainCore) {
      suggestion = `[Top ventas España #${spain.spainMarketRank}] ${suggestion}`;
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
      spainMarketRank: spain.spainMarketRank,
      spainRegistrations: spain.spainRegistrations,
      spainCore: spain.spainCore,
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
      };
      acc.push(row);
    }
    const spain = resolveSpainMeta(entry);
    row.modelsInCatalog += 1;
    if (spain.spainCore) row.spainCoreModels += 1;
    const modelIssues = chunks.filter((c) =>
      isIssueOrRecall(c) && chunkMatchesCatalogModel(c, entry.brandSlug, entry.modelSlug),
    );
    if (modelIssues.length < minIssues) {
      row.modelsWithoutIssues += 1;
      if (spain.spainCore) row.spainCoreGaps += 1;
    }
    return acc;
  }, [] as BrandCoverageSummary[]);

  brandSummaries.sort(
    (a, b) => b.spainCoreGaps - a.spainCoreGaps || b.modelsWithoutIssues - a.modelsWithoutIssues,
  );

  const kmCoverage = trimCatalog.entries
    .map((entry) => buildKmCoverageForModel(chunks, entry))
    .filter((row) => row.spainCore && row.issueChunkCount > 0)
    .sort(
      (a, b) =>
        (a.spainMarketRank ?? 9999) - (b.spainMarketRank ?? 9999) ||
        a.kmCoveragePct - b.kmCoveragePct,
    );

  return {
    generatedAt: new Date().toISOString(),
    corpusChunks: chunks.length,
    catalogModels: trimCatalog.entries.length,
    spainCoreModels,
    minIssuesThreshold: minIssues,
    modelGaps,
    brandSummaries,
    kmCoverage,
    evalFailures: options?.evalFailureNames ?? [],
  };
}

export function formatCoverageGapReport(report: CoverageGapReport): string {
  const spainGaps = report.modelGaps.filter((g) => g.spainCore);
  const otherGaps = report.modelGaps.filter((g) => !g.spainCore);

  const lines: string[] = [
    `Corpus: ${report.corpusChunks} chunks · Catálogo trims: ${report.catalogModels} modelos (${report.spainCoreModels} top ventas España)`,
    `Modelos con < ${report.minIssuesThreshold} issue/recall específicos: ${report.modelGaps.length} (${spainGaps.length} en top España)`,
    "",
    "=== Prioridad España — top ventas sin cobertura A ===",
  ];

  if (spainGaps.length === 0) {
    lines.push("(ninguno — top España cubierto a nivel mínimo)");
  } else {
    for (const gap of spainGaps.slice(0, 25)) {
      const rankLabel = gap.spainMarketRank != null ? `#${gap.spainMarketRank}` : "?";
      const sales =
        gap.spainRegistrations != null ? ` · ~${gap.spainRegistrations.toLocaleString("es-ES")} mat.` : "";
      lines.push(
        `[${gap.priority}] ${rankLabel} ${gap.displayName}${sales} · trims ${gap.trimCount} · issues ${gap.issueChunkCount} (curados ${gap.curatedIssueCount}) · plataforma ${gap.platformChunkCount}`,
      );
      lines.push(`  → ${gap.suggestion}`);
    }
  }

  if (otherGaps.length > 0) {
    lines.push("", "=== Otros modelos del catálogo (menor prioridad mercado) ===");
    for (const gap of otherGaps.slice(0, 10)) {
      lines.push(
        `[${gap.priority}] ${gap.displayName} · trims ${gap.trimCount} · issues ${gap.issueChunkCount} (curados ${gap.curatedIssueCount})`,
      );
      lines.push(`  → ${gap.suggestion}`);
    }
  }

  lines.push("", "=== Resumen por marca (gaps top España) ===");
  for (const brand of report.brandSummaries.filter((b) => b.spainCoreGaps > 0 || b.spainCoreModels > 0).slice(0, 15)) {
    lines.push(
      `${brand.brandSlug}: ${brand.issueChunks} issues (${brand.curatedIssues} curados) · top España gaps ${brand.spainCoreGaps}/${brand.spainCoreModels}`,
    );
  }

  if (report.evalFailures.length > 0) {
    lines.push("", "=== Fallos rag-eval (añadir corpus) ===");
    for (const name of report.evalFailures) {
      lines.push(`- ${name}`);
    }
  }

  const kmSpain = report.kmCoverage.filter((k) => k.spainCore);
  lines.push("", "=== Cobertura km (typicalKm) — top ventas España ===");
  if (kmSpain.length === 0) {
    lines.push("(sin modelos top con issues)");
  } else {
    const sinKm = kmSpain.filter((k) => k.status === "sin_km");
    const bajo = kmSpain.filter((k) => k.status === "bajo");
    const ok = kmSpain.filter((k) => k.status === "ok");
    lines.push(
      `OK ≥50%: ${ok.length} · BAJO <50%: ${bajo.length} · SIN_KM: ${sinKm.length} (de ${kmSpain.length} modelos con issues)`,
    );
    for (const row of kmSpain) {
      const rank = row.spainMarketRank != null ? `#${row.spainMarketRank}` : "?";
      const label = row.status === "sin_km" ? "SIN_KM" : row.status === "bajo" ? "BAJO" : "OK";
      lines.push(
        `[${label}] ${rank} ${row.displayName}: ${row.issuesWithKmCount}/${row.issueChunkCount} issues con km (${row.kmCoveragePct}%)`,
      );
      if (row.issueIdsWithoutKm.length > 0 && row.status !== "ok") {
        lines.push(`  sin km: ${row.issueIdsWithoutKm.slice(0, 4).join(", ")}${row.issueIdsWithoutKm.length > 4 ? "…" : ""}`);
      }
    }
  }

  return lines.join("\n");
}
