import type { VehicleIdentity } from "@/types/identity";
import type { MarketValuation } from "@/types/market";
import type { VehicleListing } from "@/types/listing";
import type { RetrievedDocument } from "@/types/rag";
import type { SourceCitation } from "@/types/source";
import type { TechnicalKnowledge } from "@/types/technical";
import type {
  AnalyzeResponse,
  MaintenanceSummary,
  ReliabilitySummary,
  ValuationResult,
} from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

export interface VehicleContext {
  vehicle: Vehicle;
  marketData: ValuationResult;
  comparableListings: VehicleListing[];
  alternatives: VehicleListing[];
  reliabilityData: ReliabilitySummary;
  maintenanceData: MaintenanceSummary;
  sourceData: SourceCitation[];
  retrievedDocuments?: RetrievedDocument[];
  /** Identidad validada del análisis (coherencia marca/modelo/motor). */
  identity?: VehicleIdentity;
  /** Valoración de mercado honesta (puede no tener precio). */
  market?: MarketValuation;
  /** Conocimiento técnico acotado por identidad y tren motriz. */
  knowledge?: TechnicalKnowledge;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIAnswer {
  text: string;
  provider: string;
  isDemo: boolean;
  origin: "observed" | "ai_estimate" | "demo_model";
  usedDocuments: string[];
  disclaimer?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;
  answerQuestion(
    question: string,
    context: VehicleContext,
    history: ChatMessage[],
  ): Promise<AIAnswer>;
}

export interface SearchIntent {
  brand?: string;
  model?: string;
  maxPrice?: number;
  minPrice?: number;
  maxMileage?: number;
  fuel?: string;
  transmission?: string;
  bodyType?: string;
  yearlyKilometers?: number;
  rawQuery: string;
}

export interface OpportunitySearchAgent {
  parseIntent(query: string): Promise<SearchIntent>;
  findOpportunities(intent: SearchIntent): Promise<AnalyzeResponse[]>;
}
