import type { KnowledgeChunk, KnowledgeVectorIndex } from "@/types/knowledge";
import type { RetrievedDocument, RetrievalQuery } from "@/types/rag";
import { loadKnowledgeChunks, loadKnowledgeVectorIndex } from "@/lib/rag/knowledge/load";
import { chunkToDocument } from "@/lib/rag/knowledge/to-documents";
import {
  buildTfidfVector,
  chunkSearchText,
  computeIdf,
  cosineSimilarity,
  matchesVehicleFilters,
} from "@/lib/rag/vector/math";

function buildRuntimeIndex(chunks: KnowledgeChunk[]): KnowledgeVectorIndex {
  const documents = chunks.map(chunkSearchText);
  const idf = computeIdf(documents);
  return {
    version: 1,
    algorithm: "tfidf",
    builtAt: new Date().toISOString(),
    documentCount: chunks.length,
    vocabularySize: Object.keys(idf).length,
    idf,
    entries: chunks.map((chunk) => ({
      chunkId: chunk.id,
      vector: buildTfidfVector(chunkSearchText(chunk), idf),
    })),
  };
}

export class KnowledgeVectorStore {
  private readonly chunks: KnowledgeChunk[];
  private readonly index: KnowledgeVectorIndex;
  private readonly chunkMap: Map<string, KnowledgeChunk>;

  constructor(chunks: KnowledgeChunk[], index?: KnowledgeVectorIndex | null) {
    this.chunks = chunks;
    this.index = index ?? buildRuntimeIndex(chunks);
    this.chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  }

  static create(): KnowledgeVectorStore {
    const chunks = loadKnowledgeChunks();
    return new KnowledgeVectorStore(chunks, loadKnowledgeVectorIndex());
  }

  query(input: RetrievalQuery): RetrievedDocument[] {
    const limit = input.limit ?? 6;
    const queryText = [input.text, input.vehicle?.brand, input.vehicle?.model, String(input.vehicle?.year ?? "")]
      .filter(Boolean)
      .join(" ");
    const queryVector = buildTfidfVector(queryText, this.index.idf);
    const vectorByChunkId = new Map(this.index.entries.map((entry) => [entry.chunkId, entry.vector]));

    const ranked = this.chunks
      .filter((chunk) => matchesVehicleFilters(chunk, input.vehicle))
      .map((chunk) => {
        const vector = vectorByChunkId.get(chunk.id) ?? buildTfidfVector(chunkSearchText(chunk), this.index.idf);
        const semanticScore = cosineSimilarity(queryVector, vector);
        const brand = input.vehicle?.brand?.toLowerCase() ?? "";
        const metadataBoost =
          (chunk.type === "issue" || chunk.type === "recall" ? 0.05 : 0) +
          (brand && chunk.brands.some((item) => item.toLowerCase().includes(brand) || brand.includes(item.toLowerCase()))
            ? 0.08
            : 0);
        return {
          chunk,
          score: semanticScore + metadataBoost,
        };
      })
      .filter((item) => item.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked.map(({ chunk, score }) => ({
      document: chunkToDocument(chunk, input.vehicle as never),
      score,
    }));
  }

  queryChunks(input: RetrievalQuery): KnowledgeChunk[] {
    return this.query(input)
      .map((item) => this.chunkMap.get(String(item.document.metadata.chunkId)))
      .filter((chunk): chunk is KnowledgeChunk => chunk != null);
  }
}

let sharedStore: KnowledgeVectorStore | null = null;

export function getKnowledgeVectorStore(): KnowledgeVectorStore {
  if (!sharedStore) sharedStore = KnowledgeVectorStore.create();
  return sharedStore;
}
