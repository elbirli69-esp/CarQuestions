import type {
  BuyVerdict,
  InspectionChecklist,
  ListingQuality,
  MissingDataReport,
  Scorecard,
} from "@/types/analysis";
import type { VehicleIdentity } from "@/types/identity";
import type { MarketValuation } from "@/types/market";
import type { VehicleListing } from "@/types/listing";
import type { SourceCitation } from "@/types/source";
import type { TechnicalKnowledge } from "@/types/technical";
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
  p25: number;
  median: number;
  p75: number;
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
}

/** @deprecated Usar SellerQuestion de @/types/analysis (con priority/category). */
export interface SellerQuestion {
  question: string;
  why: string;
  relatedIssue?: string;
  priority?: "high" | "medium" | "low";
  category?: string;
  evidenceLevel?: string;
  id?: string;
}

export type DataMode = "demo" | "live" | "mixed" | "knowledge";

export interface AnalyzeResponse {
  id: string;
  generatedAt: string;
  dataMode: DataMode;
  vehicle: Vehicle;
  /** Identificación canónica y validación de coherencia. */
  identity: VehicleIdentity;
  /** Veredicto principal: ¿es una buena compra? */
  buyVerdict: BuyVerdict;
  /** Valoración de mercado honesta (puede no tener precio). */
  market: MarketValuation;
  /** Conocimiento técnico por niveles de evidencia. */
  knowledge: TechnicalKnowledge;
  /** Adaptador legacy para componentes que aún consumen ValuationResult. */
  valuation: ValuationResult;
  /** Scorecard por dimensiones con confianza. */
  scores: Scorecard;
  listingQuality: ListingQuality;
  missingData: MissingDataReport;
  inspection: InspectionChecklist;
  comparables: VehicleListing[];
  alternatives: VehicleListing[];
  sources: SourceCitation[];
  /** Notas del scrape / búsqueda (antibot, muestra, páginas…). */
  searchNotes?: string[];
  /** Notas del scrape de la ficha del anuncio (URL pegada). */
  listingDetailNotes?: string[];
  /** @deprecated Usar listingQuality. Se mantiene por compatibilidad. */
  listingAnalysis: ListingAnalysis;
  sellerQuestions: SellerQuestion[];
  /** @deprecated Usar knowledge. Se mantiene por compatibilidad con el chat. */
  reliability: ReliabilitySummary;
  /** @deprecated Usar knowledge.maintenance. */
  maintenance: MaintenanceSummary;
  limitations: string[];
}
