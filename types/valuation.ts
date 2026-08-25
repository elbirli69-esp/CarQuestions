import type { IdentityEvidenceChain } from "@/lib/vehicles/identity";
import type { ConsistencyReport } from "@/lib/vehicles/consistency";
import type { EvidenceLevel, SourceClass } from "@/lib/vehicles/evidence";
import type { InspectionChecklist } from "@/lib/vehicles/inspection-checklist";
import type { MissingDataReport } from "@/lib/vehicles/missing-data";
import type { PurchaseVerdict } from "@/lib/vehicles/purchase-verdict";
import type { VehicleListing } from "@/types/listing";
import type { SourceCitation } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";

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
  /** €/km medio de la muestra comparable, si hay km. */
  eurPerKm?: number;
}

export type ConfidenceBand = "alta" | "media" | "baja" | "muy_baja";

export interface PriceAdjustment {
  label: string;
  amount: number;
  reason: string;
  origin: DataOrigin;
  applied: boolean;
}

export type MatchStrictness = "strict" | "relaxed" | "broad";

export interface ValuationResult {
  /** Null when there is no honest market estimate. */
  estimatedPrice: number | null;
  advertisedPrice?: number;
  low: number | null;
  high: number | null;
  percentDifference?: number;
  verdict: PriceVerdict;
  verdictLabel: string;
  summary: string;
  confidence: number;
  confidenceBand?: ConfidenceBand;
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
  /** True when we refuse to invent a market price. */
  insufficientMarketData?: boolean;
  /** Optional segment reference clearly separated from market price. */
  segmentReference?: {
    amount: number;
    label: string;
    disclaimer: string;
  };
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
  sourceClass?: SourceClass;
  confidence?: "high" | "medium" | "low";
}

export type SharedComponentMatchConfidence = "confirmed" | "possible";

/** Nivel B: fallo de motor/caja compartido entre modelos, no específico del bastidor. */
export interface SharedComponentIssue extends KnownIssue {
  evidenceLevel: "B";
  componentCodes: string[];
  matchConfidence: SharedComponentMatchConfidence;
  matchReason: string;
}

export interface SharedComponentSummary {
  available: boolean;
  issues: SharedComponentIssue[];
  notes: string[];
  isDemo: boolean;
  /** Motor/caja resueltos desde catálogo o campos del vehículo. */
  codesResolved: boolean;
  resolvedEngineCode?: string;
  resolvedGearboxCode?: string;
}

export interface ReliabilitySummary {
  available: boolean;
  score: number | null;
  notes: string[];
  knownIssues: KnownIssue[];
  isDemo: boolean;
  source: string;
}

export interface MaintenanceSummary {
  available: boolean;
  notes: string[];
  upcoming: string[];
  estimatedYearlyCost?: number;
  isDemo: boolean;
  source: string;
}

export interface ListingAnalysis {
  available: boolean;
  /** 0–100 quality of information in the listing/form. */
  qualityScore: number;
  price: string;
  vehicle: string;
  description: string;
  equipment: string;
  risk: "bajo" | "medio" | "alto" | "desconocido";
  likes: string[];
  concerns: string[];
  askSeller: string[];
  inspectBeforeBuying: string[];
  missingFields: string[];
  limitations: string[];
}

export type SellerQuestionPriority = "alta" | "media" | "baja";
export type SellerQuestionCategory =
  | "documentacion"
  | "mecanica"
  | "electrico"
  | "historial"
  | "legal"
  | "modelo";

export interface SellerQuestion {
  question: string;
  why: string;
  relatedIssue?: string;
  priority?: SellerQuestionPriority;
  category?: SellerQuestionCategory;
  reason?: string;
}

export type DataMode = "demo" | "live" | "mixed" | "knowledge";

export interface AnalyzeResponse {
  id: string;
  generatedAt: string;
  dataMode: DataMode;
  vehicle: Vehicle;
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
  sharedComponents?: SharedComponentSummary;
  maintenance: MaintenanceSummary;
  limitations: string[];
  consistency?: ConsistencyReport;
  identityEvidence?: IdentityEvidenceChain;
  purchaseVerdict?: PurchaseVerdict;
  missingData?: MissingDataReport;
  inspectionChecklist?: InspectionChecklist;
  /** Curado manualmente en modo experto. */
  expertCurated?: boolean;
  expertCuratedAt?: string;
}
