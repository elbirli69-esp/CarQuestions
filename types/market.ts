import type { ConfidenceLevel } from "@/types/identity";

export type PriceVerdict =
  | "muy_barato"
  | "barato"
  | "precio_de_mercado"
  | "caro"
  | "muy_caro"
  | "sin_precio"
  | "sin_mercado";

/**
 *  observed    — hay anuncios comparables reales y suficientes para una mediana.
 *  insufficient— hay algún anuncio, pero muy pocos para hablar de mercado.
 *  unavailable — no hay ningún comparable. No se finge un mercado.
 */
export type MarketStatus = "observed" | "insufficient" | "unavailable";

export interface PriceDistribution {
  count: number;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  iqr: number;
  /** Precio mediano por kilómetro recorrido, útil para comparar desgaste. */
  medianPricePerKm: number | null;
}

export type AdjustmentOrigin = "user_declared" | "observed_market";

export interface PriceAdjustment {
  label: string;
  amount: number;
  reason: string;
  origin: AdjustmentOrigin;
}

/** Cuántos comparables cumplen cada criterio de equivalencia (FASE 8). */
export interface ComparabilityBreakdown {
  total: number;
  sameFuel: number;
  sameTransmission: number;
  similarPower: number;
  closeYear: number;
  closeMileage: number;
  /** Media de similitud 0–1 de los comparables usados. */
  averageSimilarity: number;
}

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  label: string;
  /** Qué sostiene (o hunde) la confianza, en lenguaje llano. */
  drivers: string[];
  /** Puntuación interna 0–100. No se muestra como cifra exacta al usuario. */
  score: number;
}

/**
 * Referencia de segmento. Es un orden de magnitud interno, nunca un precio de
 * mercado. Solo existe para los modelos con ancla documentada; para el resto
 * se devuelve null antes que inventar una cifra.
 */
export interface SegmentReference {
  value: number;
  basis: string;
  disclaimer: string;
}

export interface MarketValuation {
  status: MarketStatus;
  /** null si no hay mercado observable. Nunca se rellena con una estimación. */
  estimatedPrice: number | null;
  range: { low: number; high: number } | null;
  distribution: PriceDistribution | null;
  advertisedPrice?: number;
  /** Diferencia relativa del anuncio frente a la estimación (solo si hay mercado). */
  percentDifference?: number;
  verdict: PriceVerdict;
  verdictLabel: string;
  summary: string;
  confidence: ConfidenceAssessment;
  adjustments: PriceAdjustment[];
  comparability: ComparabilityBreakdown | null;
  comparableCount: number;
  sourceCount: number;
  matchStrictness: "strict" | "relaxed" | "broad" | null;
  dataUpdatedAt: string;
  methodology: string[];
  limitations: string[];
  segmentReference: SegmentReference | null;
  /** Enlace a la búsqueda para que el usuario contraste por su cuenta. */
  marketSearchUrl?: string;
}
