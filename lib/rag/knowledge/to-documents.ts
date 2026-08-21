import type { KnowledgeChunk } from "@/types/knowledge";
import type { VehicleDocument } from "@/types/rag";
import type { Vehicle } from "@/types/vehicle";

export function chunkToDocument(chunk: KnowledgeChunk, vehicle?: Vehicle): VehicleDocument {
  const cost =
    chunk.estimatedCostEur?.min != null || chunk.estimatedCostEur?.max != null
      ? ` Coste orientativo: ${chunk.estimatedCostEur.min ?? "?"}-${chunk.estimatedCostEur.max ?? "?"} EUR.`
      : "";

  const interval = chunk.maintenanceInterval ? ` Intervalo: ${chunk.maintenanceInterval}.` : "";

  return {
    id: `knowledge_${chunk.id}`,
    source: chunk.source,
    url: chunk.sourceUrl,
    vehicle: {
      brand: chunk.brands[0],
      model: chunk.models?.[0],
      year: vehicle?.year,
    },
    content: `${chunk.title}. ${chunk.content}${interval}${cost} Fuente: ${chunk.source}.`,
    metadata: {
      chunkId: chunk.id,
      chunkType: chunk.type,
      severity: chunk.severity,
      appliesWhen: chunk.appliesWhen,
      tags: chunk.tags,
      brands: chunk.brands,
      models: chunk.models,
      fuels: chunk.fuels,
      yearFrom: chunk.yearFrom,
      yearTo: chunk.yearTo,
      isDemo: chunk.isDemo,
    },
    timestamp: new Date().toISOString(),
    kind: "static",
    isDemo: chunk.isDemo,
  };
}

export function chunksToDocuments(chunks: KnowledgeChunk[], vehicle?: Vehicle): VehicleDocument[] {
  return chunks.map((chunk) => chunkToDocument(chunk, vehicle));
}
