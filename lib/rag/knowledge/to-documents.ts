import type { KnowledgeChunk } from "@/types/knowledge";
import type { VehicleDocument } from "@/types/rag";
import type { Vehicle } from "@/types/vehicle";

export function chunkToDocument(chunk: KnowledgeChunk, vehicle?: Vehicle): VehicleDocument {
  const cost =
    chunk.estimatedCostEur?.min != null || chunk.estimatedCostEur?.max != null
      ? ` Coste orientativo: ${chunk.estimatedCostEur.min ?? "?"}-${chunk.estimatedCostEur.max ?? "?"} EUR.`
      : "";

  const interval = chunk.maintenanceInterval ? ` Intervalo: ${chunk.maintenanceInterval}.` : "";
  const kmRange =
    chunk.typicalKmFrom != null || chunk.typicalKmTo != null
      ? ` Kilometraje típico: ${chunk.typicalKmFrom ?? "?"}-${chunk.typicalKmTo ?? "?"} km.`
      : "";
  const symptoms =
    chunk.symptoms && chunk.symptoms.length > 0
      ? ` Síntomas: ${chunk.symptoms.join("; ")}.`
      : "";
  const askSeller =
    chunk.askSeller && chunk.askSeller.length > 0
      ? ` Preguntar al vendedor: ${chunk.askSeller.join("; ")}.`
      : "";
  const inspectSteps =
    chunk.inspectSteps && chunk.inspectSteps.length > 0
      ? ` Revisar: ${chunk.inspectSteps.join("; ")}.`
      : "";

  return {
    id: `knowledge_${chunk.id}`,
    source: chunk.source,
    url: chunk.sourceUrl,
    vehicle: {
      brand: chunk.brands[0],
      model: chunk.models?.[0],
      year: vehicle?.year,
    },
    content: `${chunk.title}. ${chunk.content}${symptoms}${askSeller}${inspectSteps}${interval}${kmRange}${cost} Fuente: ${chunk.source}.`,
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
