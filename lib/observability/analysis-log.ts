type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    scope: "carquestions",
    event,
    ...data,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const analysisLog = {
  vehicleExtraction(data: Record<string, unknown>) {
    emit("info", "vehicle.extraction", data);
  },
  vehicleValidation(data: Record<string, unknown>) {
    emit("info", "vehicle.validation", data);
  },
  marketSearch(data: Record<string, unknown>) {
    emit("info", "market.search", data);
  },
  marketResults(data: Record<string, unknown>) {
    emit("info", "market.results", data);
  },
  ragRetrieval(data: Record<string, unknown>) {
    emit("info", "rag.retrieval", data);
  },
  ragConfidence(data: Record<string, unknown>) {
    emit("info", "rag.confidence", data);
  },
  aiGeneration(data: Record<string, unknown>) {
    emit("info", "ai.generation", data);
  },
  fallback(data: Record<string, unknown>) {
    emit("warn", "fallback", data);
  },
};
