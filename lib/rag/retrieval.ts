import type { KnowledgeChunk } from "@/types/knowledge";
import type { RetrievedDocument, RetrievalQuery, VehicleDocument } from "@/types/rag";
import type { Vehicle } from "@/types/vehicle";
import { getKnowledgeVectorStore } from "@/lib/rag/vector/store";
import { tokenize } from "@/lib/utils/math";

export class InMemoryKeywordIndex {
  private documents: VehicleDocument[] = [];

  async upsert(documents: VehicleDocument[]): Promise<void> {
    const ids = new Set(documents.map((document) => document.id));
    this.documents = [
      ...this.documents.filter((document) => !ids.has(document.id)),
      ...documents,
    ];
  }

  async query(input: RetrievalQuery): Promise<RetrievedDocument[]> {
    const terms = tokenize(input.text);
    if (terms.length === 0) return [];

    return this.documents
      .map((document) => {
        const haystack = tokenize(
          `${document.content} ${document.vehicle?.brand ?? ""} ${document.vehicle?.model ?? ""}`,
        );
        const overlap = terms.filter((term) =>
          haystack.some((token) => token.includes(term) || term.includes(token)),
        ).length;
        const score = overlap / terms.length;
        return { document, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit ?? 6);
  }
}

export function createDocumentIndex(documents: VehicleDocument[]): InMemoryKeywordIndex {
  const index = new InMemoryKeywordIndex();
  void index.upsert(documents);
  return index;
}

export async function retrieveDocuments(
  input: RetrievalQuery,
  dynamicDocuments: VehicleDocument[] = [],
): Promise<RetrievedDocument[]> {
  const limit = input.limit ?? 6;
  const knowledgeHits = getKnowledgeVectorStore().query({ ...input, limit: Math.max(limit, 8) });
  const dynamicHits = await createDocumentIndex(dynamicDocuments).query({ ...input, limit });

  const merged = new Map<string, RetrievedDocument>();
  for (const hit of [...knowledgeHits, ...dynamicHits]) {
    const existing = merged.get(hit.document.id);
    if (!existing || hit.score > existing.score) {
      merged.set(hit.document.id, hit);
    }
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function retrieveKnowledgeForVehicle(vehicle: Vehicle, limit = 12): KnowledgeChunk[] {
  const queryText = [
    vehicle.brand,
    vehicle.model,
    vehicle.version,
    String(vehicle.year),
    vehicle.fuel,
    vehicle.transmission,
    "fiabilidad mantenimiento fallos averías",
  ]
    .filter(Boolean)
    .join(" ");

  return getKnowledgeVectorStore()
    .queryChunks({
      text: queryText,
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        fuel: vehicle.fuel,
        version: vehicle.version,
      },
      limit,
    })
    .filter(Boolean);
}
