import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadKnowledgeCorpus } from "../lib/rag/knowledge/load";
import { assertUniqueChunkIds } from "../lib/rag/knowledge/schema";
import { buildTfidfVector, chunkSearchText, computeIdf } from "../lib/rag/vector/math";
import type { KnowledgeVectorIndex } from "../types/knowledge";

const OUTPUT = join(process.cwd(), "data", "knowledge", "vector-index.json");

function main() {
  const corpus = loadKnowledgeCorpus();
  assertUniqueChunkIds(corpus.chunks);

  const documents = corpus.chunks.map(chunkSearchText);
  const idf = computeIdf(documents);
  const index: KnowledgeVectorIndex = {
    version: 1,
    algorithm: "tfidf",
    builtAt: new Date().toISOString(),
    documentCount: corpus.chunks.length,
    vocabularySize: Object.keys(idf).length,
    idf,
    entries: corpus.chunks.map((chunk) => ({
      chunkId: chunk.id,
      vector: buildTfidfVector(chunkSearchText(chunk), idf),
    })),
  };

  writeFileSync(OUTPUT, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(
    `Built knowledge vector index: ${index.documentCount} chunks, ${index.vocabularySize} terms -> ${OUTPUT}`,
  );
}

main();
