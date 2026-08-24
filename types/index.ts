export type * from "@/types/ai";
export type * from "@/types/listing";
export type * from "@/types/rag";
export type * from "@/types/source";
export type * from "@/types/vehicle";

// Tipos principales del análisis (exportar explícitamente para evitar colisiones).
export type {
  AnalysisReport,
  BuyVerdict,
  BuyVerdictLevel,
  BuyVerdictReason,
  InspectionChecklist,
  InspectionItem,
  InspectionStage,
  InspectionStageGroup,
  ListingQuality,
  ListingQualityCriterion,
  MissingDataItem,
  MissingDataReport,
  Scorecard,
  ScoreDimension as AnalysisScoreDimension,
  SellerQuestion as RankedSellerQuestion,
} from "@/types/analysis";

export type { EvidenceLevel, EvidenceRef, SourceType } from "@/types/evidence";
export type { CanonicalVehicle, VehicleIdentity, ConsistencyIssue } from "@/types/identity";
export type { MarketValuation, MarketStatus, PriceDistribution as MarketPriceDistribution } from "@/types/market";
export type { TechnicalKnowledge, TechnicalFinding } from "@/types/technical";

export type {
  AnalyzeResponse,
  DataMode,
  KnownIssue,
  ListingAnalysis,
  MaintenanceSummary,
  ReliabilitySummary,
  SellerQuestion,
  ValuationResult,
  VehicleScorecard,
} from "@/types/valuation";
