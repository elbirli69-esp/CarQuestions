import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { average, clamp } from "@/lib/utils/math";

export function chunkToKnownIssue(chunk: KnowledgeChunk): KnownIssue | null {
  if (chunk.type !== "issue" && chunk.type !== "recall") return null;
  return {
    title: chunk.title,
    detail: chunk.content,
    severity: chunk.severity ?? "medium",
    appliesWhen: chunk.appliesWhen ?? chunk.title,
    source: chunk.source,
    isDemo: chunk.isDemo,
  };
}

export function chunksToReliability(chunks: KnowledgeChunk[], vehicle: Vehicle): ReliabilitySummary {
  const issues = chunks
    .filter((chunk) => chunk.type === "issue" || chunk.type === "recall")
    .map(chunkToKnownIssue)
    .filter((issue): issue is KnownIssue => issue != null);

  const scoreValues = chunks
    .map((chunk) => chunk.reliabilityScore)
    .filter((value): value is number => typeof value === "number");

  if (issues.length === 0 && scoreValues.length === 0) {
    return {
      available: false,
      score: null,
      notes: [
        `No hay ficha de fiabilidad suficientemente específica para ${vehicle.brand} ${vehicle.model} ${vehicle.year} en la base de conocimiento.`,
      ],
      knownIssues: [],
      isDemo: true,
      source: "Base de conocimiento RAG",
    };
  }

  const maintenanceNotes = chunks
    .filter((chunk) => chunk.type === "maintenance")
    .map((chunk) => `${chunk.title}: ${chunk.content}`);

  const score =
    scoreValues.length > 0
      ? Math.round(clamp(average(scoreValues) ?? 70, 40, 95))
      : issues.some((issue) => issue.severity === "high")
        ? 68
        : 75;

  return {
    available: true,
    score,
    notes:
      maintenanceNotes.length > 0
        ? maintenanceNotes.slice(0, 3)
        : [`Ficha recuperada de la base de conocimiento para ${vehicle.brand} ${vehicle.model}.`],
    knownIssues: issues.slice(0, 8),
    isDemo: chunks.some((chunk) => chunk.isDemo),
    source: "Base de conocimiento RAG",
  };
}

export function chunksToMaintenance(chunks: KnowledgeChunk[]): MaintenanceSummary {
  const maintenance = chunks.filter((chunk) => chunk.type === "maintenance");
  const inspections = chunks.filter((chunk) => chunk.type === "inspection");

  if (maintenance.length === 0 && inspections.length === 0) {
    return {
      available: false,
      notes: ["Sin ficha de mantenimiento específica en la base de conocimiento."],
      upcoming: [],
      isDemo: true,
      source: "Base de conocimiento RAG",
    };
  }

  const yearlyCosts = maintenance
    .map((chunk) => chunk.estimatedCostEur?.max ?? chunk.estimatedCostEur?.min)
    .filter((value): value is number => typeof value === "number");

  return {
    available: true,
    notes: maintenance.map((chunk) => chunk.content).slice(0, 4),
    upcoming: [
      ...maintenance
        .map((chunk) => chunk.maintenanceInterval)
        .filter((value): value is string => Boolean(value)),
      ...inspections.map((chunk) => chunk.content).slice(0, 3),
    ].slice(0, 6),
    estimatedYearlyCost:
      yearlyCosts.length > 0 ? Math.round(average(yearlyCosts) ?? 0) : undefined,
    isDemo: chunks.some((chunk) => chunk.isDemo),
    source: "Base de conocimiento RAG",
  };
}
