import type { EvidenceLevel } from "@/types/evidence";
import type { CanonicalVehicle } from "@/types/identity";
import type { KnowledgeChunkType } from "@/types/knowledge";
import { evaluateChunk, type ChunkRelevance } from "@/lib/rag/knowledge/relevance";
import { getKnowledgeVectorStore } from "@/lib/rag/vector/store";
import { fuelLabel, powertrainLabel } from "@/lib/vehicles/identity/taxonomy";

export interface ScoredRelevance extends ChunkRelevance {
  score: number;
}

export interface ScopedRetrievalOptions {
  /** Texto libre adicional (pregunta del usuario). Vacío = perfil del vehículo. */
  text?: string;
  limit?: number;
  types?: KnowledgeChunkType[];
  /** Nivel de evidencia mínimo aceptado. Por defecto se admite hasta C. */
  maxLevel?: EvidenceLevel;
}

export interface ScopedRetrievalResult {
  hits: ScoredRelevance[];
  /** Diagnóstico: cuántos fragmentos se descartaron y por qué. */
  stats: {
    total: number;
    applicable: number;
    excluded: number;
    exclusionReasons: Record<string, number>;
    byLevel: Record<EvidenceLevel, number>;
  };
}

/** Prioridad de recuperación: modelo exacto > motor/plataforma > segmento. */
const LEVEL_BOOST: Record<EvidenceLevel, number> = { A: 0.45, B: 0.18, C: 0, D: 0 };
const LEVEL_RANK: Record<EvidenceLevel, number> = { A: 0, B: 1, C: 2, D: 3 };

function vehicleProfileText(vehicle: CanonicalVehicle): string {
  return [
    vehicle.make.value,
    vehicle.model.value,
    vehicle.trim?.value,
    vehicle.engineCode?.value,
    String(vehicle.year.value),
    fuelLabel(vehicle.fuelType.value),
    powertrainLabel(vehicle.powertrain.value),
    vehicle.transmission?.value,
    "fiabilidad averías mantenimiento síntomas inspección",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Recuperación acotada al vehículo.
 *
 * Nunca rellena huecos de conocimiento específico con conocimiento genérico:
 * cada acierto conserva su nivel de evidencia para que la capa superior decida
 * si puede presentarse como "problema conocido de este modelo" o solo como
 * contexto de segmento.
 */
export function retrieveScopedKnowledge(
  vehicle: CanonicalVehicle,
  options: ScopedRetrievalOptions = {},
): ScopedRetrievalResult {
  const store = getKnowledgeVectorStore();
  const limit = options.limit ?? 24;
  const maxRank = LEVEL_RANK[options.maxLevel ?? "C"];

  const queryText = [vehicleProfileText(vehicle), options.text].filter(Boolean).join(" ");
  const scores = store.scoreChunks(queryText);

  const exclusionReasons: Record<string, number> = {};
  const byLevel: Record<EvidenceLevel, number> = { A: 0, B: 0, C: 0, D: 0 };
  const hits: ScoredRelevance[] = [];
  const chunks = store.allChunks();

  for (const chunk of chunks) {
    if (options.types && !options.types.includes(chunk.type)) continue;

    const relevance = evaluateChunk(chunk, vehicle);
    if (!relevance.applicable) {
      const reason = relevance.exclusionReason ?? "sin motivo";
      exclusionReasons[reason] = (exclusionReasons[reason] ?? 0) + 1;
      continue;
    }
    if (LEVEL_RANK[relevance.evidenceLevel] > maxRank) continue;

    byLevel[relevance.evidenceLevel] += 1;
    const semantic = scores.get(chunk.id) ?? 0;
    hits.push({ ...relevance, score: semantic + LEVEL_BOOST[relevance.evidenceLevel] });
  }

  hits.sort((a, b) => {
    const byLevelRank = LEVEL_RANK[a.evidenceLevel] - LEVEL_RANK[b.evidenceLevel];
    if (byLevelRank !== 0) return byLevelRank;
    return b.score - a.score;
  });

  const applicable = hits.length;
  return {
    hits: hits.slice(0, limit),
    stats: {
      total: chunks.length,
      applicable,
      excluded: chunks.length - applicable,
      exclusionReasons,
      byLevel,
    },
  };
}
