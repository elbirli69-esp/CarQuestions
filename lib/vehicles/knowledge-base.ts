import type { Vehicle } from "@/types/vehicle";
import { logEvent } from "@/lib/observability/log";
import { classifyChunkEvidence } from "@/lib/rag/evidence";
import { chunksToMaintenance, chunksToReliability } from "@/lib/rag/knowledge/to-reliability";
import { retrieveKnowledgeForVehicle } from "@/lib/rag/retrieval";

export function lookupKnowledge(vehicle: Vehicle, options?: { blocked?: boolean; reason?: string }) {
  if (options?.blocked) {
    logEvent("rag.retrieval", {
      blocked: true,
      reason: options.reason ?? "consistency",
      brand: vehicle.brand,
      model: vehicle.model,
    }, "warn");
    return {
      reliability: {
        available: false,
        score: null,
        notes: [
          "No se genera conocimiento técnico: los datos del vehículo no son coherentes. Corrige marca, modelo, versión o combustible antes de atribuir averías.",
        ],
        knownIssues: [],
        isDemo: false,
        source: "Validación de coherencia",
        insufficientEvidence: true,
      },
      maintenance: {
        available: false,
        notes: ["Conocimiento de mantenimiento bloqueado hasta que la identidad del vehículo sea coherente."],
        upcoming: [],
        isDemo: false,
        source: "Validación de coherencia",
      },
      knowledgeChunks: [],
    };
  }

  const chunks = retrieveKnowledgeForVehicle(vehicle, 20);
  const levels = chunks.map((chunk) => classifyChunkEvidence(chunk, vehicle));
  logEvent("rag.retrieval", {
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    fuel: vehicle.fuel,
    chunkCount: chunks.length,
    levelA: levels.filter((level) => level === "A").length,
    levelB: levels.filter((level) => level === "B").length,
  });
  logEvent("rag.confidence", {
    brand: vehicle.brand,
    model: vehicle.model,
    specificEnough: levels.some((level) => level === "A" || level === "B"),
  });

  return {
    reliability: chunksToReliability(chunks, vehicle),
    maintenance: chunksToMaintenance(chunks, vehicle),
    knowledgeChunks: chunks,
  };
}
