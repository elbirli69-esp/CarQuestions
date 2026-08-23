import type { EvidenceLevel, EvidenceRef } from "@/types/evidence";
import type { KnowledgeChunkType } from "@/types/knowledge";

export interface TechnicalFinding {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  evidence: EvidenceRef;
  appliesWhen: string;
  symptoms: string[];
  chunkType: KnowledgeChunkType;
  estimatedCostEur?: { min?: number; max?: number };
}

/**
 * Estado del conocimiento técnico disponible para el vehículo.
 *
 *  specific    — hay patrones documentados de este modelo y motor (nivel A).
 *  platform    — solo hay patrones de la marca o mecánica compartida (nivel B).
 *  segment_only— solo conocimiento general del segmento (nivel C).
 *  none        — no hay nada aplicable.
 *  blocked     — los datos del vehículo se contradicen: no se afirma nada.
 */
export type TechnicalKnowledgeStatus =
  | "specific"
  | "platform"
  | "segment_only"
  | "none"
  | "blocked";

export interface MaintenanceGuidance {
  available: boolean;
  evidenceLevel: EvidenceLevel | null;
  items: Array<{
    title: string;
    detail: string;
    interval?: string;
    evidence: EvidenceRef;
    estimatedCostEur?: { min?: number; max?: number };
  }>;
  /**
   * Coste anual solo si procede de fragmentos de nivel A/B con coste declarado.
   * Nunca se estima "a ojo".
   */
  estimatedYearlyCostEur: number | null;
  notes: string[];
}

export interface ReliabilityAssessment {
  /** null cuando no hay base documental suficiente. Nunca se inventa un número. */
  score: number | null;
  evidenceLevel: EvidenceLevel | null;
  basis: string;
  sampleSize: number;
}

export interface KnowledgeCoverage {
  totalChunks: number;
  applicable: number;
  excluded: number;
  byLevel: Record<EvidenceLevel, number>;
  /** Motivos de exclusión más frecuentes, para depurar el corpus. */
  topExclusions: Array<{ reason: string; count: number }>;
}

export interface TechnicalKnowledge {
  status: TechnicalKnowledgeStatus;
  /** Frase honesta sobre lo que sabemos y lo que no. */
  headline: string;
  modelSpecific: TechnicalFinding[];
  platformShared: TechnicalFinding[];
  segmentContext: TechnicalFinding[];
  maintenance: MaintenanceGuidance;
  reliability: ReliabilityAssessment;
  coverage: KnowledgeCoverage;
  notes: string[];
}
