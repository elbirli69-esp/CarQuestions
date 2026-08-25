/**
 * Evalúa recall del RAG con preguntas típicas de compradores.
 * Uso: npm run rag:eval
 */
import { RAG_FULL_EVAL_CASES } from "../lib/rag/eval/full-cases";
import { runRagEval, RAG_EVAL_MIN_PASS_RATE } from "../lib/rag/eval/run";

const result = runRagEval(RAG_FULL_EVAL_CASES);

console.log(`Corpus: ${result.corpusChunkCount} chunks`);
console.log(
  `RAG eval: ${result.passed}/${result.total} cases hit expected topics in top-8 (${(result.passRate * 100).toFixed(1)}%)`,
);

for (const row of result.rows) {
  console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}  →  ${row.top}`);
}

if (result.passRate < RAG_EVAL_MIN_PASS_RATE) {
  console.error(`FAIL: pass rate below ${RAG_EVAL_MIN_PASS_RATE * 100}%`);
  process.exitCode = 1;
}
