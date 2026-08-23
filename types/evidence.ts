/**
 * Jerarquía de evidencia. Determina qué se puede afirmar sobre un vehículo
 * concreto y con qué rotundidad.
 *
 *  A — específico del vehículo: modelo, generación y motorización coinciden.
 *  B — plataforma o motor compartido: misma marca/familia mecánica.
 *  C — segmento: conocimiento general (SUV híbridos, diésel urbanos, EV…).
 *  D — inferencia: conclusión generada por el modelo, sin respaldo documental.
 */
export const EVIDENCE_LEVELS = ["A", "B", "C", "D"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  A: "Específico de este modelo y motor",
  B: "Plataforma o motor compartido",
  C: "Conocimiento general del segmento",
  D: "Inferencia de CarQuestions",
};

export const EVIDENCE_LEVEL_SHORT: Record<EvidenceLevel, string> = {
  A: "Este modelo",
  B: "Motor/plataforma",
  C: "Segmento",
  D: "Inferencia",
};

/**
 * Naturaleza de la fuente de una afirmación (FASE 7).
 * Permite al usuario saber si algo viene de un anuncio, del fabricante,
 * de un organismo oficial, de literatura técnica o de una inferencia.
 */
export const SOURCE_TYPES = [
  "official",
  "government",
  "manufacturer",
  "marketplace",
  "technical",
  "community",
  "inference",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  official: "Documentación oficial",
  government: "Organismo público (DGT/ITV/NHTSA…)",
  manufacturer: "Fabricante",
  marketplace: "Anuncios de portales",
  technical: "Literatura técnica y talleres",
  community: "Foros y comunidad de propietarios",
  inference: "Inferencia de CarQuestions",
};

/** Cómo de firme es una afirmación concreta. */
export interface EvidenceRef {
  level: EvidenceLevel;
  sourceType: SourceType;
  source: string;
  sourceUrl?: string;
  /** Sobre qué campos casó la evidencia: ["marca", "modelo", "motor"]. */
  matchedOn: string[];
}
