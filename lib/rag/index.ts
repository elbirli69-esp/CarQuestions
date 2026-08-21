import type { DocumentIndex, RetrievedDocument, RetrievalQuery, VehicleDocument } from "@/types/rag";
import { tokenize } from "@/lib/utils/math";

export class InMemoryKeywordIndex implements DocumentIndex {
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
        const overlap = terms.filter((term) => haystack.some((token) => token.includes(term) || term.includes(token))).length;
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
