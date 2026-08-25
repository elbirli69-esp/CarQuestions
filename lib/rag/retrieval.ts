import type { KnowledgeChunk } from "@/types/knowledge";
import type { RetrievedDocument, RetrievalQuery, VehicleDocument } from "@/types/rag";
import type { Vehicle } from "@/types/vehicle";
import {
  classifyQuestionIntent,
  expandAutomotiveQuery,
  intentRetrievalBoost,
} from "@/lib/rag/query/expand";
import { buildVehicleKnowledgeQuery } from "@/lib/rag/knowledge/retrieval-query";
import { getKnowledgeVectorStore } from "@/lib/rag/vector/store";
import { tokenize } from "@/lib/utils/math";
import type { VehicleComponentCodes } from "@/lib/vehicles/component-codes";

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
    const terms = tokenize(expandAutomotiveQuery(input.text));
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
  options?: { pinnedDocumentIds?: string[]; pinnedMinScore?: number },
): Promise<RetrievedDocument[]> {
  const limit = input.limit ?? 8;
  const intent = classifyQuestionIntent(input.text);
  const expandedText = `${expandAutomotiveQuery(input.text)} ${intentRetrievalBoost(intent)}`;
  const query = { ...input, text: expandedText, limit: Math.max(limit, 10) };

  const knowledgeHits = getKnowledgeVectorStore().query(query);
  const dynamicHits = await createDocumentIndex(dynamicDocuments).query(query);

  const merged = new Map<string, RetrievedDocument>();
  for (const hit of [...knowledgeHits, ...dynamicHits]) {
    const existing = merged.get(hit.document.id);
    if (!existing || hit.score > existing.score) {
      merged.set(hit.document.id, hit);
    }
  }

  const intentBoost = (doc: VehicleDocument): number => {
    const kind = doc.metadata?.docKind as string | undefined;
    if (intent === "price" && kind === "market_stats") return 0.35;
    if (intent === "price" && kind === "comparable") return 0.15;
    if (intent === "equipment" && kind === "listing_detail") return 0.3;
    if (intent === "equipment" && kind === "listing_description") return 0.25;
    if (intent === "negotiation" && (kind === "market_stats" || kind === "comparable")) return 0.2;
    return 0;
  };

  const pinned = new Set(options?.pinnedDocumentIds ?? []);
  const pinnedMin = options?.pinnedMinScore ?? 0.82;

  return [...merged.values()]
    .map((hit) => ({
      ...hit,
      score: Math.min(
        1,
        hit.score + intentBoost(hit.document) + (pinned.has(hit.document.id) ? pinnedMin : 0),
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function retrieveKnowledgeForVehicle(
  vehicle: Vehicle,
  limit = 16,
  componentCodes?: VehicleComponentCodes,
): KnowledgeChunk[] {
  const query = buildVehicleKnowledgeQuery(vehicle, { limit, componentCodes });
  return getKnowledgeVectorStore().queryChunks(query).filter(Boolean);
}
