import type { AnalyzeResponse } from "@/types/valuation";

const analyses = new Map<string, AnalyzeResponse>();
const MAX_ENTRIES = 200;

export function saveAnalysis(analysis: AnalyzeResponse): void {
  if (analyses.size >= MAX_ENTRIES) {
    const firstKey = analyses.keys().next().value;
    if (firstKey) analyses.delete(firstKey);
  }
  analyses.set(analysis.id, analysis);
}

export function getAnalysis(id: string): AnalyzeResponse | undefined {
  return analyses.get(id);
}
