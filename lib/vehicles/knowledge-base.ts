import type { Vehicle } from "@/types/vehicle";
import { chunksToMaintenance, chunksToReliability } from "@/lib/rag/knowledge/to-reliability";
import { retrieveKnowledgeForVehicle } from "@/lib/rag/retrieval";

export function lookupKnowledge(
  vehicle: Vehicle,
  options?: { allowModelKnowledge?: boolean },
) {
  const allowModelKnowledge = options?.allowModelKnowledge ?? true;
  const chunks = allowModelKnowledge ? retrieveKnowledgeForVehicle(vehicle, 20) : [];

  return {
    reliability: chunksToReliability(chunks, vehicle, { allowModelKnowledge }),
    maintenance: chunksToMaintenance(chunks, vehicle, { allowModelKnowledge }),
    knowledgeChunks: chunks,
  };
}
