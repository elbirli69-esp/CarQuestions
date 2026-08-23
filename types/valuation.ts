import type { CanonicalVehicle } from "@/lib/vehicles/canonical";
import type { ClaimSourceKind, ConfidenceBand, ConsistencyReport, EvidenceLevel } from "@/types/evidence";
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

export type MarketStatus = "observed" | "insufficient" | "none";

export interface PriceDistribution {
  count: number;
  min: number;
  p10?: number;
  p25: number;
  median: number;
  p75: number;
  p90?: number;
  max: number;
  pricePerKm?: number;
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
  /** Present only when the figure is a segment heuristic, not a market median. */
  isSegmentReference?: boolean;
  segmentReference?: number;
  marketStatus?: MarketStatus;
  advertisedPrice?: number;
  low: number;
  high: number;
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
}

export interface ScoreDimension {
  id: string;
  label: string;
  score: number | null;
  reason: string;
  origin: DataOrigin;
  insufficientData: boolean;
  evidence?: string;
  confidence?: ConfidenceBand;
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
  sourceType?: ClaimSourceKind;
  sourceUrl?: string;
}

export interface ReliabilitySummary {
  available: boolean;
  score: number | null;
  notes: string[];
  knownIssues: KnownIssue[];
  isDemo: boolean;
  source: string;
  evidenceLevel?: EvidenceLevel;
  insufficientEvidence?: boolean;
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
  price: string;
  vehicle: string;
  description: string;
  equipment: string;
  risk: "bajo" | "medio" | "alto" | "desconocido";
  likes: string[];
  concerns: string[];
  askSeller: string[];
  inspectBeforeBuying: string[];
  limitations: string[];
  qualityScore?: number;
  missingItems?: string[];
}

export type QuestionPriority = "alta" | "media" | "baja";

export interface SellerQuestion {
  question: string;
  why: string;
  reason?: string;
  relatedIssue?: string;
  priority?: QuestionPriority;
  category?: string;
}

export type PurchaseVerdictId =
  | "buena_oportunidad"
  | "precio_razonable"
  | "compraria_con_precaucion"
  | "no_sin_investigar"
  | "datos_incoherentes";

export interface PurchaseVerdict {
  id: PurchaseVerdictId;
  label: string;
  tone: "good" | "ok" | "caution" | "bad";
  summary: string;
}

export type InspectionPhase = "before" | "cold" | "drive" | "hot" | "pay";

export interface InspectionItem {
  phase: InspectionPhase;
  title: string;
  detail: string;
}

export interface InspectionChecklist {
  items: InspectionItem[];
  adaptedTo: string;
}

export interface MissingDataItem {
  field: string;
  label: string;
  impactPercent: number;
  reason: string;
}

export interface MissingDataReport {
  completeness: number;
  potentialGainPercent: number;
  message: string;
  items: MissingDataItem[];
}

export interface ListingQuality {
  score: number;
  missing: Array<{ id: string; label: string; weight: number }>;
  present: Array<{ id: string; label: string }>;
  summary: string;
}

export type DataMode = "demo" | "live" | "mixed" | "knowledge";

export interface AnalyzeResponse {
  id: string;
  generatedAt: string;
  dataMode: DataMode;
  vehicle: Vehicle;
  canonicalVehicle?: CanonicalVehicle;
  consistency?: ConsistencyReport;
  purchaseVerdict?: PurchaseVerdict;
  missingData?: MissingDataReport;
  listingQuality?: ListingQuality;
  inspectionChecklist?: InspectionChecklist;
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
