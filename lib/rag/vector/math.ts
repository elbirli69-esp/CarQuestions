import type { KnowledgeChunk } from "@/types/knowledge";
import { chunkMatchesBrand, chunkMatchesModel } from "@/lib/rag/knowledge/filters";
import { tokenize } from "@/lib/utils/math";

export function chunkSearchText(chunk: KnowledgeChunk): string {
  return [
    chunk.title,
    chunk.content,
    chunk.appliesWhen,
    chunk.source,
    chunk.maintenanceInterval,
    chunk.motorCodes?.join(" "),
    chunk.tags?.join(" "),
    chunk.brands.join(" "),
    chunk.models?.join(" "),
    chunk.fuels?.join(" "),
    chunk.symptoms?.join(" "),
    chunk.askSeller?.join(" "),
    chunk.inspectSteps?.join(" "),
    chunk.typicalKmFrom != null ? `desde ${chunk.typicalKmFrom} km` : null,
    chunk.typicalKmTo != null ? `hasta ${chunk.typicalKmTo} km` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildTermFrequencies(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const term of tokenize(text)) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
}

export function computeIdf(documents: string[]): Record<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    const uniqueTerms = new Set(tokenize(document));
    for (const term of uniqueTerms) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const totalDocuments = documents.length;
  const idf: Record<string, number> = {};
  for (const [term, df] of documentFrequency.entries()) {
    idf[term] = Math.log((1 + totalDocuments) / (1 + df)) + 1;
  }
  return idf;
}

export function buildTfidfVector(
  text: string,
  idf: Record<string, number>,
): Record<string, number> {
  const tf = buildTermFrequencies(text);
  const maxTf = Math.max(1, ...tf.values());
  const vector: Record<string, number> = {};

  for (const [term, count] of tf.entries()) {
    const weight = (count / maxTf) * (idf[term] ?? 1);
    if (weight > 0) vector[term] = weight;
  }

  return vector;
}

export function cosineSimilarity(
  left: Record<string, number>,
  right: Record<string, number>,
): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const value of Object.values(left)) leftNorm += value * value;
  for (const value of Object.values(right)) rightNorm += value * value;

  const keys = leftNorm <= rightNorm ? Object.keys(left) : Object.keys(right);
  for (const key of keys) {
    const a = left[key] ?? 0;
    const b = right[key] ?? 0;
    dot += a * b;
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function matchesVehicleFilters(
  chunk: KnowledgeChunk,
  vehicle?: { brand?: string; model?: string; year?: number; fuel?: string; version?: string },
): boolean {
  if (!vehicle) return true;

  if (vehicle.brand && !chunkMatchesBrand(chunk, vehicle.brand)) return false;
  if (
    (vehicle.model || vehicle.version) &&
    !chunkMatchesModel(chunk, vehicle.model ?? "", vehicle.version ?? "")
  ) {
    return false;
  }

  if (chunk.fuels && chunk.fuels.length > 0 && vehicle.fuel && !chunk.fuels.includes(vehicle.fuel as never)) {
    return false;
  }

  if (chunk.yearFrom && vehicle.year && vehicle.year < chunk.yearFrom) return false;
  if (chunk.yearTo && vehicle.year && vehicle.year > chunk.yearTo) return false;

  return true;
}
