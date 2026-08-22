import type { Vehicle } from "@/types/vehicle";
import { chunksToMaintenance, chunksToReliability } from "@/lib/rag/knowledge/to-reliability";
import { retrieveKnowledgeForVehicle } from "@/lib/rag/retrieval";

export function lookupKnowledge(vehicle: Vehicle) {
  const chunks = retrieveKnowledgeForVehicle(vehicle, 20);

  return {
    reliability: chunksToReliability(chunks, vehicle),
    maintenance: chunksToMaintenance(chunks, vehicle),
    knowledgeChunks: chunks,
  };
}
