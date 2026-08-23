import type { KnowledgeChunk } from "@/types/knowledge";
import type { EvidenceLevel } from "@/types/vehicle-validation";
import type { Vehicle } from "@/types/vehicle";
import { chunkAppliesToAllBrands, chunkMatchesBrand, chunkMatchesModel } from "@/lib/rag/knowledge/filters";
import { normalizeKey } from "@/lib/utils/math";

export interface ChunkEvidence {
  level: EvidenceLevel;
  label: string;
  reason: string;
}

function modelTokens(modelRaw: string, versionRaw = ""): string[] {
  const combined = normalizeKey(`${modelRaw} ${versionRaw}`);
  return combined.split(/\s+/).filter((token) => token.length >= 2);
}

function chunkHasExactModelMatch(chunk: KnowledgeChunk, vehicle: Pick<Vehicle, "model" | "version">): boolean {
  if (!chunk.models || chunk.models.length === 0) return false;
  const tokens = modelTokens(vehicle.model, vehicle.version ?? "");
  return chunk.models.some((item) => {
    const key = normalizeKey(item);
    return tokens.some((token) => token === key || token.includes(key) || key.includes(token));
  });
}

function chunkHasEngineOrPlatformMatch(chunk: KnowledgeChunk, vehicle: Vehicle): boolean {
  if (chunk.motorCodes && chunk.motorCodes.length > 0 && vehicle.version) {
    const version = normalizeKey(vehicle.version);
    return chunk.motorCodes.some((code) => version.includes(normalizeKey(code)));
  }
  return false;
}

export function classifyChunkEvidence(chunk: KnowledgeChunk, vehicle: Vehicle): ChunkEvidence {
  const universal = chunkAppliesToAllBrands(chunk);
  const brandMatch = chunkMatchesBrand(chunk, vehicle.brand);
  const exactModel = chunkHasExactModelMatch(chunk, vehicle);
  const engineMatch = chunkHasEngineOrPlatformMatch(chunk, vehicle);

  if (!brandMatch) {
    return {
      level: "D",
      label: "No aplicable",
      reason: "El fragmento no corresponde a la marca indicada.",
    };
  }

  if (exactModel && brandMatch && !universal) {
    return {
      level: "A",
      label: "Específico del modelo",
      reason: `Información vinculada a ${vehicle.brand} ${vehicle.model}.`,
    };
  }

  if (engineMatch || (brandMatch && chunk.models && chunk.models.length > 0 && !exactModel && !universal)) {
    return {
      level: "B",
      label: "Plataforma o motor compartido",
      reason: "Información de motor/plataforma relacionada, no necesariamente de esta versión exacta.",
    };
  }

  if (universal || !chunk.models || chunk.models.length === 0) {
    const fuelScoped =
      chunk.fuels && chunk.fuels.length > 0 && vehicle.fuel && chunk.fuels.includes(vehicle.fuel);
    return {
      level: "C",
      label: fuelScoped ? "Segmento (combustible)" : "Segmento general",
      reason: fuelScoped
        ? `Patrón general de vehículos ${vehicle.fuel}, no un problema documentado de este modelo.`
        : "Conocimiento genérico de precompra, no específico de este vehículo.",
    };
  }

  if (chunkMatchesModel(chunk, vehicle.model, vehicle.version ?? "")) {
    return {
      level: "B",
      label: "Familia de modelos",
      reason: "Aplica a modelos relacionados de la misma marca.",
    };
  }

  return {
    level: "D",
    label: "Inferencia",
    reason: "Sin evidencia suficiente para atribuirlo a este vehículo.",
  };
}

export function evidenceLevelRank(level: EvidenceLevel): number {
  switch (level) {
    case "A":
      return 4;
    case "B":
      return 3;
    case "C":
      return 2;
    case "D":
      return 1;
    default:
      return 0;
  }
}

export function isModelSpecificEvidence(level: EvidenceLevel): boolean {
  return level === "A" || level === "B";
}
