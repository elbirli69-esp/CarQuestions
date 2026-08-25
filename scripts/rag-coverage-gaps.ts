/**
 * Backlog de curación: modelos del catálogo con poca cobertura issue/recall.
 * Uso: npm run rag:gaps
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAG_ADVERSARIAL_CASES } from "../lib/rag/eval/cases";
import { RAG_FULL_EVAL_CASES } from "../lib/rag/eval/full-cases";
import { runRagEval } from "../lib/rag/eval/run";
import { buildCoverageGapReport, formatCoverageGapReport } from "../lib/rag/coverage/gaps";

const evalResult = runRagEval([...RAG_FULL_EVAL_CASES, ...RAG_ADVERSARIAL_CASES]);
const failureNames = evalResult.failures.map((f) => f.name);

const report = buildCoverageGapReport({
  minIssuesPerModel: 1,
  evalFailureNames: failureNames,
});

const text = formatCoverageGapReport(report);
console.log(text);

const outDir = join(process.cwd(), ".data");
const jsonPath = join(outDir, "rag-coverage-gaps.json");
try {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nJSON: ${jsonPath}`);
} catch (error) {
  console.warn("No se pudo escribir JSON de gaps:", error);
}

if (failureNames.length > 0) {
  console.log(`\nEval combinado: ${evalResult.passed}/${evalResult.total} (fallos listados arriba)`);
}
