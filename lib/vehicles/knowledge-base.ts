import type { Vehicle } from "@/types/vehicle";
import { chunksToMaintenance, chunksToReliability } from "@/lib/rag/knowledge/to-reliability";
import { chunksToSharedComponents } from "@/lib/rag/knowledge/shared-components";
import { retrieveKnowledgeForVehicle } from "@/lib/rag/retrieval";
import {
  resolveVehicleComponentCodes,
  type VehicleComponentCodes,
} from "@/lib/vehicles/component-codes";

export function lookupKnowledge(
  vehicle: Vehicle,
  componentCodes?: VehicleComponentCodes,
) {
  const codes = componentCodes ?? resolveVehicleComponentCodes(vehicle);
  const chunks = retrieveKnowledgeForVehicle(vehicle, 24);

  return {
    reliability: chunksToReliability(chunks, vehicle),
    sharedComponents: chunksToSharedComponents(chunks, vehicle, codes),
    maintenance: chunksToMaintenance(chunks, vehicle),
    knowledgeChunks: chunks,
  };
}
