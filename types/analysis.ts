import type { EvidenceLevel } from "@/types/evidence";
import type { ConfidenceLevel, VehicleIdentity } from "@/types/identity";
import type { VehicleListing } from "@/types/listing";
import type { MarketValuation } from "@/types/market";
import type { SourceCitation } from "@/types/source";
import type { TechnicalKnowledge } from "@/types/technical";
import type { Vehicle } from "@/types/vehicle";

// --- Veredicto de compra (FASE 16) ------------------------------------------

export const BUY_VERDICT_LEVELS = [
  "good_opportunity",
  "fair_price",
  "caution",
  "high_risk",
  "insufficient_data",
] as const;
export type BuyVerdictLevel = (typeof BUY_VERDICT_LEVELS)[number];

export interface BuyVerdictReason {
  text: string;
  tone: "positive" | "neutral" | "negative";
}

export interface BuyVerdict {
  level: BuyVerdictLevel;
  /** Semáforo: verde, amarillo, naranja, rojo o gris. */
  tone: "green" | "amber" | "orange" | "red" | "neutral";
  headline: string;
  detail: string;
  reasons: BuyVerdictReason[];
  confidence: ConfidenceLevel;
}

// --- Scorecard (FASE 10) -----------------------------------------------------

export interface ScoreDimension {
  id: string;
  label: string;
  /** null = sin datos suficientes. Nunca se rellena con una nota inventada. */
  score: number | null;
  explanation: string;
  evidence: string;
  evidenceLevel: EvidenceLevel | null;
  confidence: ConfidenceLevel;
}

export interface Scorecard {
  dimensions: ScoreDimension[];
  /** null si hay menos de 3 dimensiones puntuables. */
  overall: number | null;
  overallLabel: string | null;
  summary: string;
  scoredCount: number;
}

// --- Calidad del anuncio (FASE 11) ------------------------------------------

export interface ListingQualityCriterion {
  id: string;
  label: string;
  present: boolean;
  weight: number;
  detail: string;
}

export interface ListingQuality {
  score: number;
  level: "excelente" | "buena" | "mejorable" | "pobre";
  summary: string;
  criteria: ListingQualityCriterion[];
  missing: string[];
}

// --- Preguntas al vendedor (FASE 12) ----------------------------------------

export const QUESTION_PRIORITIES = ["high", "medium", "low"] as const;
export type QuestionPriority = (typeof QUESTION_PRIORITIES)[number];

export const QUESTION_CATEGORIES = [
  "documentacion",
  "historial",
  "mecanica",
  "electrificacion",
  "carroceria",
  "uso",
  "precio",
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export interface SellerQuestion {
  id: string;
  question: string;
  reason: string;
  priority: QuestionPriority;
  category: QuestionCategory;
  evidenceLevel: EvidenceLevel;
  /** Presente solo cuando la pregunta nace de un hallazgo documentado. */
  source?: string;
}

// --- Checklist de inspección (FASE 13) --------------------------------------

export const INSPECTION_STAGES = [
  "before_visit",
  "cold",
  "test_drive",
  "hot",
  "before_paying",
] as const;
export type InspectionStage = (typeof INSPECTION_STAGES)[number];

export interface InspectionItem {
  id: string;
  text: string;
  why: string;
  critical: boolean;
  evidenceLevel: EvidenceLevel;
}

export interface InspectionStageGroup {
  stage: InspectionStage;
  label: string;
  description: string;
  items: InspectionItem[];
}

export interface InspectionChecklist {
  stages: InspectionStageGroup[];
  note: string;
}

// --- Datos que faltan (FASE 14) ---------------------------------------------

export interface MissingDataItem {
  field: string;
  label: string;
  /** Peso relativo 1–10 de cuánto mejoraría el análisis. */
  impact: number;
  why: string;
}

export interface MissingDataReport {
  items: MissingDataItem[];
  /** Rango estimado de mejora, null si no hay margen relevante. */
  improvementRange: { min: number; max: number } | null;
  summary: string;
}

// --- Diagnóstico / observabilidad (FASE 22) ---------------------------------

export interface AnalysisDiagnostics {
  durationMs: number;
  stages: Array<{ stage: string; ms: number; detail?: string }>;
  knowledge: {
    totalChunks: number;
    applicable: number;
    excluded: number;
    byLevel: Record<EvidenceLevel, number>;
  };
  market: {
    rawListings: number;
    usedListings: number;
    providersQueried: number;
    providersConnected: number;
  };
}

// --- Informe completo --------------------------------------------------------

export interface AnalysisReport {
  id: string;
  generatedAt: string;
  vehicle: Vehicle;
  identity: VehicleIdentity;
  buyVerdict: BuyVerdict;
  market: MarketValuation;
  knowledge: TechnicalKnowledge;
  scores: Scorecard;
  listingQuality: ListingQuality;
  sellerQuestions: SellerQuestion[];
  inspection: InspectionChecklist;
  missingData: MissingDataReport;
  comparables: VehicleListing[];
  sources: SourceCitation[];
  searchNotes: string[];
  listingDetailNotes?: string[];
  limitations: string[];
  diagnostics: AnalysisDiagnostics;
}
