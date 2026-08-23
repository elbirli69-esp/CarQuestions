type LogContext = Record<string, unknown>;

function log(level: "info" | "warn" | "error", event: string, context?: LogContext): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const analysisLogger = {
  vehicleValidation(result: { severity: string; issueCount: number; brand: string; model: string }) {
    log("info", "vehicle.validation", result);
  },
  marketSearch(result: { comparableCount: number; brand: string; model: string }) {
    log("info", "market.search", result);
  },
  ragRetrieval(result: {
    chunkCount: number;
    modelSpecificIssues: number;
    segmentNotes: number;
    brand: string;
    model: string;
  }) {
    log("info", "rag.retrieval", result);
  },
  analysisComplete(result: { id: string; dataMode: string; canUseModelKnowledge: boolean }) {
    log("info", "analysis.complete", result);
  },
  fallback(reason: string, context?: LogContext) {
    log("warn", "analysis.fallback", { reason, ...context });
  },
};
