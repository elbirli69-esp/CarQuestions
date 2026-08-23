import type { VehicleListing } from "@/types/listing";
import type { SourceCitation } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";
import type { ConfidenceTier, VehicleValidationResult } from "@/types/vehicle-validation";
import type { EvidenceLevel } from "@/types/vehicle-validation";

export type PriceVerdict =
  | "muy_barato"
  | "barato"
  | "precio_de_mercado"
  | "caro"
  | "muy_caro"
  | "sin_precio";

export type DataOrigin = "observed" | "ai_estimate" | "demo_model";

export interface PriceDistribution {
  count: number;
  min: number;
  p10?: number;
  p25: number;
  median: number;
  p75: number;
  p90?: number;
  max: number;
}

export interface PriceAdjustment {
  label: string;
  amount: number;
  reason: string;
  origin: DataOrigin;
  applied: boolean;
}

export type MatchStrictness = "strict" | "relaxed" | "broad";

export interface ValuationResult {
  estimatedPrice: number;
  advertisedPrice?: number;
  low: number;
  high: number;
  percentDifference?: number;
  verdict: PriceVerdict;
  verdictLabel: string;
  summary: string;
  confidence: number;
  confidenceTier?: ConfidenceTier;
  /** Factores legibles que explican el % de confianza. */
  confidenceDrivers?: string[];
  /** Media de similarity de los comparables usados (0–1). */
  avgSimilarity?: number;
  /** Cómo de estrechos fueron los filtros de comparables. */
  matchStrictness?: MatchStrictness;
  distribution: PriceDistribution;
  adjustments: PriceAdjustment[];
  comparableCount: number;
  sourceCount: number;
  dataUpdatedAt: string;
  origin: DataOrigin;
  methodology: string[];
  limitations: string[];
}

export interface ScoreDimension {
  id: string;
  label: string;
  score: number | null;
  reason: string;
  origin: DataOrigin;
  insufficientData: boolean;
}

export interface VehicleScorecard {
  dimensions: ScoreDimension[];
  overall: number | null;
  overallLabel: string | null;
  summary: string;
}

export interface KnownIssue {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  appliesWhen: string;
  source: string;
  isDemo: boolean;
  evidenceLevel?: EvidenceLevel;
  evidenceLabel?: string;
}

export interface SegmentNote {
  title: string;
  detail: string;
  evidenceLevel: EvidenceLevel;
  evidenceLabel: string;
  source: string;
}

export interface ReliabilitySummary {
  available: boolean;
  score: number | null;
  notes: string[];
  knownIssues: KnownIssue[];
  segmentNotes?: SegmentNote[];
  isDemo: boolean;
  source: string;
  hasModelSpecificEvidence?: boolean;
}

export interface MaintenanceSummary {
  available: boolean;
  notes: string[];
  upcoming: string[];
  estimatedYearlyCost?: number;
  isDemo: boolean;
  source: string;
}

export interface ListingQualityFactor {
  id: string;
  label: string;
  score: number | null;
  maxScore: number;
  status: "ok" | "missing" | "warning";
  note: string;
}

export interface InspectionChecklistPhase {
  phase: "before_visit" | "cold" | "test_drive" | "hot" | "before_payment";
  phaseLabel: string;
  items: string[];
}

export interface ListingAnalysis {
  available: boolean;
  qualityScore: number | null;
  qualityFactors: ListingQualityFactor[];
  price: string;
  vehicle: string;
  description: string;
  equipment: string;
  risk: "bajo" | "medio" | "alto" | "desconocido";
  likes: string[];
  concerns: string[];
  askSeller: string[];
  inspectBeforeBuying: string[];
  inspectionChecklist: InspectionChecklistPhase[];
  limitations: string[];
}

export type SellerQuestionPriority = "high" | "medium" | "low";
export type SellerQuestionCategory =
  | "documentation"
  | "history"
  | "mechanical"
  | "electric"
  | "body"
  | "market"
  | "model_specific";

export interface SellerQuestion {
  question: string;
  why: string;
  relatedIssue?: string;
  priority?: SellerQuestionPriority;
  category?: SellerQuestionCategory;
  evidenceLevel?: EvidenceLevel;
}

export type PurchaseVerdict =
  | "good_opportunity"
  | "fair_price"
  | "caution"
  | "do_not_buy"
  | "insufficient_data";

export interface PurchaseRecommendation {
  verdict: PurchaseVerdict;
  label: string;
  summary: string;
  emoji: string;
}

export type DataMode = "demo" | "live" | "mixed" | "knowledge";

export interface MissingDataSuggestion {
  field: string;
  label: string;
  impact: "high" | "medium" | "low";
  message: string;
}

export interface AnalyzeResponse {
  id: string;
  generatedAt: string;
  dataMode: DataMode;
  vehicle: Vehicle;
  validation: VehicleValidationResult;
  purchaseRecommendation: PurchaseRecommendation;
  missingData: MissingDataSuggestion[];
  valuation: ValuationResult;
  scores: VehicleScorecard;
  comparables: VehicleListing[];
  alternatives: VehicleListing[];
  sources: SourceCitation[];
  /** Notas del scrape / búsqueda (antibot, muestra, páginas…). */
  searchNotes?: string[];
  /** Notas del scrape de la ficha del anuncio (URL pegada). */
  listingDetailNotes?: string[];
  listingAnalysis: ListingAnalysis;
  sellerQuestions: SellerQuestion[];
  reliability: ReliabilitySummary;
  maintenance: MaintenanceSummary;
  limitations: string[];
}
