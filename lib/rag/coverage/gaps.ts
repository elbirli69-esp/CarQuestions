import type { KnowledgeChunk } from "@/types/knowledge";
import trimsData from "@/data/vehicle-trims.json";
import { chunkAppliesToAllBrands, chunkIsModelSpecific, chunkMatchesBrand, chunkMatchesModel } from "@/lib/rag/knowledge/filters";
import { loadKnowledgeChunks } from "@/lib/rag/knowledge/load";
import type { VehicleTrimCatalog } from "@/lib/vehicles/trims-types";
import { normalizeKey } from "@/lib/utils/math";

const trimCatalog = trimsData as VehicleTrimCatalog;

export interface ModelCoverageGap {
  brandSlug: string;
  modelSlug: string;
  displayName: string;
  trimCount: number;
  issueChunkCount: number;
  curatedIssueCount: number;
  platformChunkCount: number;
  priority: "high" | "medium" | "low";
  suggestion: string;
}

export interface BrandCoverageSummary {
  brandSlug: string;
  issueChunks: number;
  curatedIssues: number;
  modelsInCatalog: number;
  modelsWithoutIssues: number;
}

export interface CoverageGapReport {
  generatedAt: string;
  corpusChunks: number;
  catalogModels: number;
  minIssuesThreshold: number;
  modelGaps: ModelCoverageGap[];
  brandSummaries: BrandCoverageSummary[];
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

export function buildCoverageGapReport(options?: {
  minIssuesPerModel?: number;
  evalFailureNames?: string[];
}): CoverageGapReport {
  const minIssues = options?.minIssuesPerModel ?? 1;
  const chunks = loadKnowledgeChunks();
  const modelGaps: ModelCoverageGap[] = [];

  for (const entry of trimCatalog.entries) {
    const issueChunks = chunks.filter((c) =>
      isIssueOrRecall(c) && chunkMatchesCatalogModel(c, entry.brandSlug, entry.modelSlug),
    );
    const curated = issueChunks.filter((c) => !c.isDemo);
    const platform = chunks.filter((c) => chunkMatchesBrandPlatform(c, entry.brandSlug));

    if (issueChunks.length >= minIssues) continue;

    const displayName = `${entry.brandSlug} ${entry.modelSlug}`;
    const priority: ModelCoverageGap["priority"] =
      entry.trims.length >= 3 || issueChunks.length === 0 ? "high" : "medium";

    let suggestion = "Añadir 1–2 chunks issue/recall con models incluyendo este modelo.";
    if (issueChunks.length === 0 && platform.length > 0) {
      suggestion = `Sin issues nivel A; hay ${platform.length} chunk(s) plataforma (nivel B) para la marca. Duplicar o enlazar por motorización.`;
    }
    if (curated.length === 0 && issueChunks.length > 0) {
      suggestion += " Todos los issues son demo — revisar y quitar isDemo.";
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
      suggestion,
    });
  }

  modelGaps.sort((a, b) => {
    const rank = (p: ModelCoverageGap["priority"]) => (p === "high" ? 0 : p === "medium" ? 1 : 2);
    return rank(a.priority) - rank(b.priority) || a.issueChunkCount - b.issueChunkCount;
  });

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
      };
      acc.push(row);
    }
    row.modelsInCatalog += 1;
    const modelIssues = chunks.filter((c) =>
      isIssueOrRecall(c) && chunkMatchesCatalogModel(c, entry.brandSlug, entry.modelSlug),
    );
    if (modelIssues.length < minIssues) row.modelsWithoutIssues += 1;
    return acc;
  }, [] as BrandCoverageSummary[]);

  brandSummaries.sort((a, b) => b.modelsWithoutIssues - a.modelsWithoutIssues);

  return {
    generatedAt: new Date().toISOString(),
    corpusChunks: chunks.length,
    catalogModels: trimCatalog.entries.length,
    minIssuesThreshold: minIssues,
    modelGaps,
    brandSummaries,
    evalFailures: options?.evalFailureNames ?? [],
  };
}

export function formatCoverageGapReport(report: CoverageGapReport): string {
  const lines: string[] = [
    `Corpus: ${report.corpusChunks} chunks · Catálogo trims: ${report.catalogModels} modelos`,
    `Modelos con < ${report.minIssuesThreshold} issue/recall específicos: ${report.modelGaps.length}`,
    "",
    "=== Prioridad alta (backlog curación) ===",
  ];

  for (const gap of report.modelGaps.filter((g) => g.priority === "high").slice(0, 20)) {
    lines.push(
      `[${gap.priority}] ${gap.displayName} · trims ${gap.trimCount} · issues ${gap.issueChunkCount} (curados ${gap.curatedIssueCount}) · plataforma ${gap.platformChunkCount}`,
    );
    lines.push(`  → ${gap.suggestion}`);
  }

  lines.push("", "=== Resumen por marca ===");
  for (const brand of report.brandSummaries.slice(0, 15)) {
    lines.push(
      `${brand.brandSlug}: ${brand.issueChunks} issues (${brand.curatedIssues} curados) · ${brand.modelsWithoutIssues}/${brand.modelsInCatalog} modelos sin cobertura A`,
    );
  }

  if (report.evalFailures.length > 0) {
    lines.push("", "=== Fallos rag-eval (añadir corpus) ===");
    for (const name of report.evalFailures) {
      lines.push(`- ${name}`);
    }
  }

  return lines.join("\n");
}
