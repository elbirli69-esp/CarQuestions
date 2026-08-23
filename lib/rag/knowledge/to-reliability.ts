import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, MaintenanceSummary, ReliabilitySummary, SegmentNote } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { chunkMatchesVehicle } from "@/lib/rag/knowledge/filters";
import { classifyChunkEvidence, isModelSpecificEvidence } from "@/lib/vehicles/evidence";
import { average, clamp } from "@/lib/utils/math";

export function chunkToKnownIssue(chunk: KnowledgeChunk, vehicle: Vehicle): KnownIssue | null {
  if (chunk.type !== "issue" && chunk.type !== "recall") return null;
  const evidence = classifyChunkEvidence(chunk, vehicle);
  const extra = [
    chunk.symptoms?.length ? `Síntomas habituales: ${chunk.symptoms.join("; ")}.` : null,
    chunk.askSeller?.length ? `Preguntar al vendedor: ${chunk.askSeller.join("; ")}.` : null,
    chunk.inspectSteps?.length ? `Revisar antes de comprar: ${chunk.inspectSteps.join("; ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: chunk.title,
    detail: extra ? `${chunk.content} ${extra}` : chunk.content,
    severity: chunk.severity ?? "medium",
    appliesWhen: chunk.appliesWhen ?? chunk.title,
    source: chunk.source,
    isDemo: false,
    evidenceLevel: evidence.level,
    evidenceLabel: evidence.label,
  };
}

export function chunksToReliability(
  chunks: KnowledgeChunk[],
  vehicle: Vehicle,
  options?: { allowModelKnowledge?: boolean },
): ReliabilitySummary {
  const allowModelKnowledge = options?.allowModelKnowledge ?? true;
  const relevant = chunks.filter((chunk) => chunkMatchesVehicle(chunk, vehicle));

  if (!allowModelKnowledge) {
    return {
      available: false,
      score: null,
      notes: [
        "Los datos del vehículo son incoherentes. No mostramos problemas técnicos atribuidos a este modelo hasta corregirlos.",
      ],
      knownIssues: [],
      segmentNotes: [],
      isDemo: false,
      source: "Base de conocimiento curada",
      hasModelSpecificEvidence: false,
    };
  }

  const classified = relevant.map((chunk) => ({
    chunk,
    evidence: classifyChunkEvidence(chunk, vehicle),
  }));

  const modelSpecific = classified.filter((item) => isModelSpecificEvidence(item.evidence.level));
  const segmentOnly = classified.filter((item) => item.evidence.level === "C");

  const issues = modelSpecific
    .filter((item) => item.chunk.type === "issue" || item.chunk.type === "recall")
    .map((item) => chunkToKnownIssue(item.chunk, vehicle))
    .filter((issue): issue is KnownIssue => issue != null);

  const segmentNotes: SegmentNote[] = segmentOnly
    .filter((item) => item.chunk.type === "issue" || item.chunk.type === "recall" || item.chunk.type === "inspection")
    .slice(0, 4)
    .map((item) => ({
      title: item.chunk.title,
      detail: item.chunk.content,
      evidenceLevel: item.evidence.level,
      evidenceLabel: item.evidence.label,
      source: item.chunk.source,
    }));

  const scoreValues = modelSpecific
    .map((item) => item.chunk.reliabilityScore)
    .filter((value): value is number => typeof value === "number");

  if (issues.length === 0 && scoreValues.length === 0) {
    return {
      available: false,
      score: null,
      notes: [
        `No tenemos evidencia suficiente para afirmar problemas conocidos específicos de ${vehicle.brand} ${vehicle.model} ${vehicle.year}.`,
        segmentNotes.length > 0
          ? "Abajo verás solo notas generales del segmento, no atribuidas a este modelo."
          : "Consulta foros especializados o un taller antes de decidir.",
      ],
      knownIssues: [],
      segmentNotes,
      isDemo: false,
      source: "Base de conocimiento curada",
      hasModelSpecificEvidence: false,
    };
  }

  const maintenanceNotes = modelSpecific
    .filter((item) => item.chunk.type === "maintenance")
    .map((item) => `${item.chunk.title}: ${item.chunk.content}`);

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
        : [`Ficha curada para ${vehicle.brand} ${vehicle.model} con evidencia de modelo o motor.`],
    knownIssues: issues.slice(0, 8),
    segmentNotes,
    isDemo: false,
    source: "Base de conocimiento curada",
    hasModelSpecificEvidence: issues.length > 0,
  };
}

export function chunksToMaintenance(
  chunks: KnowledgeChunk[],
  vehicle?: Vehicle,
  options?: { allowModelKnowledge?: boolean },
): MaintenanceSummary {
  if (options?.allowModelKnowledge === false) {
    return {
      available: false,
      notes: ["Sin ficha de mantenimiento: corrige primero los datos incoherentes del vehículo."],
      upcoming: [],
      isDemo: false,
      source: "Base de conocimiento curada",
    };
  }

  const relevant = vehicle ? chunks.filter((chunk) => chunkMatchesVehicle(chunk, vehicle)) : chunks;
  const classified = relevant.map((chunk) => ({
    chunk,
    evidence: vehicle ? classifyChunkEvidence(chunk, vehicle) : { level: "C" as const },
  }));

  const maintenance = classified
    .filter((item) => item.chunk.type === "maintenance" && isModelSpecificEvidence(item.evidence.level))
    .map((item) => item.chunk);
  const inspections = classified
    .filter((item) => item.chunk.type === "inspection" && isModelSpecificEvidence(item.evidence.level))
    .map((item) => item.chunk);

  if (maintenance.length === 0 && inspections.length === 0) {
    return {
      available: false,
      notes: ["Sin ficha de mantenimiento específica del modelo en la base de conocimiento."],
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
    estimatedYearlyCost:
      yearlyCosts.length > 0 ? Math.round(average(yearlyCosts) ?? 0) : undefined,
    isDemo: false,
    source: "Base de conocimiento curada",
  };
}
