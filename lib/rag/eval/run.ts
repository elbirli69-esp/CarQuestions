import { resetKnowledgeCache, loadKnowledgeChunks } from "@/lib/rag/knowledge/load";
import { getKnowledgeVectorStore } from "@/lib/rag/vector/store";
import {
  type RagEvalCase,
  matchesRagExpectation,
  matchesRagExclusion,
} from "@/lib/rag/eval/cases";

export interface RagEvalRow {
  name: string;
  ok: boolean;
  top: string;
  failedIncludes?: string;
  failedExcludes?: string;
}

export interface RagEvalResult {
  corpusChunkCount: number;
  passed: number;
  total: number;
  passRate: number;
  rows: RagEvalRow[];
  failures: RagEvalRow[];
}

export const RAG_EVAL_MIN_PASS_RATE = 0.75;

export function runRagEval(
  cases: RagEvalCase[],
  options?: { limit?: number },
): RagEvalResult {
  resetKnowledgeCache();
  const vectorStore = getKnowledgeVectorStore();
  const corpusChunkCount = loadKnowledgeChunks().length;
  const limit = options?.limit ?? 8;
  const rows: RagEvalRow[] = [];
  let passed = 0;

  for (const testCase of cases) {
    const hits = vectorStore.query({
      text: testCase.text,
      vehicle: testCase.vehicle,
      limit,
    });
    const ids = hits.map((hit) => hit.document.id.replace(/^knowledge_/, ""));

    let ok = true;
    let failedIncludes: string | undefined;
    let failedExcludes: string | undefined;

    if (testCase.expectIdIncludes?.length) {
      if (!ids.some((id) => matchesRagExpectation(id, testCase.expectIdIncludes!))) {
        ok = false;
        failedIncludes = testCase.expectIdIncludes.join("|");
      }
    }

    if (testCase.expectIdExcludes?.length) {
      const leaked = ids.filter((id) => matchesRagExclusion(id, testCase.expectIdExcludes!));
      if (leaked.length > 0) {
        ok = false;
        failedExcludes = leaked.join(", ");
      }
    }

    if (ok) passed += 1;
    rows.push({
      name: testCase.name,
      ok,
      top: ids.slice(0, 3).join(", "),
      failedIncludes,
      failedExcludes,
    });
  }

  const total = cases.length;
  const passRate = total > 0 ? passed / total : 1;

  return {
    corpusChunkCount,
    passed,
    total,
    passRate,
    rows,
    failures: rows.filter((row) => !row.ok),
  };
}

export function assertRagEvalPassRate(
  result: RagEvalResult,
  minPassRate = RAG_EVAL_MIN_PASS_RATE,
): void {
  if (result.passRate < minPassRate) {
    const detail = result.failures
      .map((f) => `${f.name} (top: ${f.top})`)
      .slice(0, 8)
      .join("; ");
    throw new Error(
      `RAG eval pass rate ${(result.passRate * 100).toFixed(1)}% < ${(minPassRate * 100).toFixed(0)}% (${result.passed}/${result.total}). Failures: ${detail}`,
    );
  }
}
