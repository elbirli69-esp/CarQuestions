/**
 * Informe de cobertura del corpus RAG por marca y tipo.
 * Uso: npx tsx scripts/rag-coverage.ts
 */
import { resetKnowledgeCache, loadKnowledgeChunks } from "../lib/rag/knowledge/load";

function main() {
  resetKnowledgeCache();
  const chunks = loadKnowledgeChunks();
  const byBrand = new Map<string, number>();
  const byType = new Map<string, number>();
  let withSymptoms = 0;
  let withAsk = 0;
  let universal = 0;

  for (const chunk of chunks) {
    byType.set(chunk.type, (byType.get(chunk.type) ?? 0) + 1);
    if (chunk.symptoms?.length) withSymptoms += 1;
    if (chunk.askSeller?.length) withAsk += 1;
    if (chunk.brands.some((b) => b.trim() === "*")) {
      universal += 1;
      continue;
    }
    for (const brand of chunk.brands) {
      const key = brand.toLowerCase();
      byBrand.set(key, (byBrand.get(key) ?? 0) + 1);
    }
  }

  const topBrands = [...byBrand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);

  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Universal (*): ${universal}`);
  console.log(`With symptoms: ${withSymptoms} · with askSeller: ${withAsk}`);
  console.log("By type:", Object.fromEntries(byType));
  console.log("Top brands:");
  for (const [brand, count] of topBrands) {
    console.log(`  ${brand}: ${count}`);
  }
}

main();
