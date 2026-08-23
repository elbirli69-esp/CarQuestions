type LogLevel = "info" | "warn" | "error";

export type ObservabilityEvent =
  | "vehicle.extraction"
  | "vehicle.validation"
  | "market.search"
  | "market.results"
  | "rag.retrieval"
  | "rag.confidence"
  | "ai.generation"
  | "fallback";

export function logEvent(
  event: ObservabilityEvent,
  payload: Record<string, unknown> = {},
  level: LogLevel = "info",
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    svc: "carquestions",
    event,
    ...payload,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
