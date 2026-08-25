/**
 * Valida que chunks con isDemo=false cumplan política de curación.
 * Uso: npm run rag:validate-curation
 */
import { validateCorpusCuration } from "../lib/rag/curation/policy";
import { loadKnowledgeChunks } from "../lib/rag/knowledge/load";

const chunks = loadKnowledgeChunks();
const errors = validateCorpusCuration(chunks);
const curated = chunks.filter((c) => !c.isDemo);
const demo = chunks.filter((c) => c.isDemo);

console.log(`Corpus: ${chunks.length} chunks · curados ${curated.length} · demo ${demo.length}`);

if (errors.length > 0) {
  console.error("\nErrores de curación:");
  for (const err of errors) {
    console.error(`- ${err.chunkId}: ${err.message}`);
  }
  process.exit(1);
}

console.log("Curación OK — todos los chunks isDemo=false cumplen la política.");
process.exit(0);
