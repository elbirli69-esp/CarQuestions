import type { SearchIntent, OpportunitySearchAgent } from "@/types/ai";
import type { AnalyzeResponse } from "@/types/valuation";

/**
 * Reserved for a later phase: natural-language search across portals
 * ("BMW X1 por debajo de 20.000 €", "SUV diésel fiable entre 15k y 22k").
 * The MVP only exposes the interface so the rest of the app can grow into an agent.
 */
export class FutureSearchAgent implements OpportunitySearchAgent {
  async parseIntent(query: string): Promise<SearchIntent> {
    return { rawQuery: query };
  }

  async findOpportunities(intent: SearchIntent): Promise<AnalyzeResponse[]> {
    void intent;
    throw new Error("La búsqueda por lenguaje natural entre portales llegará cuando existan fuentes reales.");
  }
}
