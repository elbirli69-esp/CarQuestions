import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { average, clamp, normalizeKey } from "@/lib/utils/math";

export function chunkToKnownIssue(chunk: KnowledgeChunk): KnownIssue | null {
  if (chunk.type !== "issue" && chunk.type !== "recall") return null;
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
  };
}

function chunkMatchesVehicle(chunk: KnowledgeChunk, vehicle: Vehicle): boolean {
  const brand = normalizeKey(vehicle.brand);
  const model = normalizeKey(vehicle.model);
  const brandOk = chunk.brands.some((item) => {
    const key = normalizeKey(item);
    return brand.includes(key) || key.includes(brand);
  });
  if (!brandOk) return false;
  if (chunk.models && chunk.models.length > 0) {
    return chunk.models.some((item) => {
      const key = normalizeKey(item);
      return model === key || model.includes(key) || key.includes(model);
    });
  }
  return true;
}

export function chunksToReliability(chunks: KnowledgeChunk[], vehicle: Vehicle): ReliabilitySummary {
  const relevant = chunks.filter((chunk) => chunkMatchesVehicle(chunk, vehicle));

  const issues = relevant
    .filter((chunk) => chunk.type === "issue" || chunk.type === "recall")
    .map(chunkToKnownIssue)
    .filter((issue): issue is KnownIssue => issue != null);

  const scoreValues = relevant
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
      isDemo: false,
      source: "Base de conocimiento curada",
    };
  }

  const maintenanceNotes = relevant
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
        : [`Ficha curada para ${vehicle.brand} ${vehicle.model} (base de conocimiento RAG).`],
    knownIssues: issues.slice(0, 8),
    isDemo: false,
    source: "Base de conocimiento curada",
  };
}

export function chunksToMaintenance(chunks: KnowledgeChunk[], vehicle?: Vehicle): MaintenanceSummary {
  const relevant = vehicle ? chunks.filter((chunk) => chunkMatchesVehicle(chunk, vehicle)) : chunks;
  const maintenance = relevant.filter((chunk) => chunk.type === "maintenance");
  const inspections = relevant.filter((chunk) => chunk.type === "inspection");

  if (maintenance.length === 0 && inspections.length === 0) {
    return {
      available: false,
      notes: ["Sin ficha de mantenimiento específica en la base de conocimiento."],
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
