import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { classifyChunkEvidence, classifySourceKind } from "@/lib/rag/evidence";
import { chunkMatchesVehicle } from "@/lib/rag/knowledge/filters";
import { average, clamp } from "@/lib/utils/math";

const INSUFFICIENT =
  "No tenemos evidencia suficiente para afirmar que este sea un problema conocido de este modelo.";

export function chunkToKnownIssue(chunk: KnowledgeChunk, vehicle?: Vehicle): KnownIssue | null {
  if (chunk.type !== "issue" && chunk.type !== "recall") return null;
  const extra = [
    chunk.symptoms?.length ? `Síntomas habituales: ${chunk.symptoms.join("; ")}.` : null,
    chunk.askSeller?.length ? `Preguntar al vendedor: ${chunk.askSeller.join("; ")}.` : null,
    chunk.inspectSteps?.length ? `Revisar antes de comprar: ${chunk.inspectSteps.join("; ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const evidenceLevel = vehicle ? classifyChunkEvidence(chunk, vehicle) : "B";

  return {
    title: chunk.title,
    detail: extra ? `${chunk.content} ${extra}` : chunk.content,
    severity: chunk.severity ?? "medium",
    appliesWhen: chunk.appliesWhen ?? chunk.title,
    source: chunk.source,
    isDemo: false,
    evidenceLevel,
    sourceType: classifySourceKind(chunk),
    sourceUrl: chunk.sourceUrl,
  };
}

export function chunksToReliability(chunks: KnowledgeChunk[], vehicle: Vehicle): ReliabilitySummary {
  const specific = chunks.filter((chunk) => chunkMatchesVehicle(chunk, vehicle, { allowUniversal: false }));
  const usable = specific.filter((chunk) => {
    const level = classifyChunkEvidence(chunk, vehicle);
    return level === "A" || level === "B";
  });

  const issues = usable
    .filter((chunk) => chunk.type === "issue" || chunk.type === "recall")
    .map((chunk) => chunkToKnownIssue(chunk, vehicle))
    .filter((issue): issue is KnownIssue => issue != null);

  const scoreValues = usable
    .map((chunk) => chunk.reliabilityScore)
    .filter((value): value is number => typeof value === "number");

  if (issues.length === 0 && scoreValues.length === 0) {
    return {
      available: false,
      score: null,
      notes: [INSUFFICIENT],
      knownIssues: [],
      isDemo: false,
      source: "Base de conocimiento curada",
      evidenceLevel: undefined,
      insufficientEvidence: true,
    };
  }

  const modelSpecific = usable.filter((chunk) => classifyChunkEvidence(chunk, vehicle) === "A");
  const evidenceLevel = modelSpecific.length > 0 ? "A" : "B";
  const maintenanceNotes = usable
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
      evidenceLevel === "A"
        ? maintenanceNotes.slice(0, 3).length > 0
          ? maintenanceNotes.slice(0, 3)
          : [`Patrones documentados para ${vehicle.brand} ${vehicle.model}. No es un diagnóstico de este bastidor.`]
        : [
            `Hay patrones de la marca o motorización, no una ficha específica de ${vehicle.brand} ${vehicle.model}.`,
            ...maintenanceNotes.slice(0, 2),
          ],
    knownIssues: issues.slice(0, 8),
    isDemo: false,
    source: "Base de conocimiento curada",
    evidenceLevel,
    insufficientEvidence: false,
  };
}

export function chunksToMaintenance(chunks: KnowledgeChunk[], vehicle?: Vehicle): MaintenanceSummary {
  const relevant = vehicle
    ? chunks.filter((chunk) => chunkMatchesVehicle(chunk, vehicle, { allowUniversal: false }))
    : chunks;
  const maintenance = relevant.filter((chunk) => chunk.type === "maintenance");
  const inspections = relevant.filter((chunk) => chunk.type === "inspection");

  if (maintenance.length === 0 && inspections.length === 0) {
    return {
      available: false,
      notes: ["Sin ficha de mantenimiento específica en la base de conocimiento. No inventamos intervalos."],
      upcoming: [],
      isDemo: false,
      source: "Base de conocimiento curada",
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
    estimatedYearlyCost: yearlyCosts.length > 0 ? Math.round(average(yearlyCosts) ?? 0) : undefined,
    isDemo: false,
    source: "Base de conocimiento curada",
  };
}
