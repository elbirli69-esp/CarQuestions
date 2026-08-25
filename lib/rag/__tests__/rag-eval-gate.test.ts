import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RAG_ADVERSARIAL_CASES } from "@/lib/rag/eval/cases";
import { RAG_FULL_EVAL_CASES } from "@/lib/rag/eval/full-cases";
import {
  assertRagEvalPassRate,
  runRagEval,
  RAG_EVAL_MIN_PASS_RATE,
} from "@/lib/rag/eval/run";
import { buildCoverageGapReport } from "@/lib/rag/coverage/gaps";

describe("RAG eval CI gate", () => {
  it("full buyer-question suite meets minimum pass rate", () => {
    const result = runRagEval(RAG_FULL_EVAL_CASES);
    assert.ok(result.total >= 50, "expected full eval case set");
    assertRagEvalPassRate(result, RAG_EVAL_MIN_PASS_RATE);
  });

  it("adversarial cases pass without leakage", () => {
    const result = runRagEval(RAG_ADVERSARIAL_CASES);
    assert.equal(result.failures.length, 0, result.failures.map((f) => f.name).join(", "));
  });

    it("coverage gap report lists catalog models", () => {
    const report = buildCoverageGapReport({ minIssuesPerModel: 1 });
    assert.ok(report.corpusChunks > 100);
    assert.ok(report.catalogModels >= 15);
    assert.ok(report.spainCoreModels >= 15);
    assert.ok(Array.isArray(report.modelGaps));
    assert.ok(report.brandSummaries.length > 0);

    const spainGaps = report.modelGaps.filter((g) => g.spainCore);
    if (spainGaps.length >= 2) {
      const ranks = spainGaps.map((g) => g.spainMarketRank ?? 9999);
      assert.ok(ranks[0] <= ranks[1], "Spain gaps should sort by market rank");
    }
  });
});
