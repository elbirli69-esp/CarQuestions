import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import {
  chunkAppliesToAllBrands,
  chunkIsModelSpecific,
  chunkMatchesVehicle,
} from "@/lib/rag/knowledge/filters";
import { classifyChunkEvidenceLevel } from "@/lib/vehicles/evidence";
import { average, clamp } from "@/lib/utils/math";

function anyDemo(chunks: KnowledgeChunk[]): boolean {
  return chunks.some((chunk) => chunk.isDemo);
}

function sourceLabel(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "Base de conocimiento";
  if (anyDemo(chunks)) return "Base de conocimiento (pendiente de revisión / demo)";
  return "Base de conocimiento curada";
}

export function chunkToKnownIssue(chunk: KnowledgeChunk): KnownIssue | null {
  if (chunk.type !== "issue" && chunk.type !== "recall") return null;
  const evidenceLevel = classifyChunkEvidenceLevel({
    brands: chunk.brands,
    models: chunk.models,
    motorCodes: chunk.motorCodes,
  });
  // Universal / segment chunks must never be presented as "known model issue"
  if (evidenceLevel === "C" || chunkAppliesToAllBrands(chunk) || !chunkIsModelSpecific(chunk)) {
    return null;
  }

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
    isDemo: chunk.isDemo,
    evidenceLevel,
    sourceClass: chunk.isDemo ? "community" : "technical",
    confidence: chunk.isDemo ? "low" : "medium",
  };
}

export function chunksToReliability(chunks: KnowledgeChunk[], vehicle: Vehicle): ReliabilitySummary {
  // Only brand+model specific chunks contribute to "model reliability"
  const modelSpecific = chunks.filter(
    (chunk) =>
      chunkIsModelSpecific(chunk) &&
      chunkMatchesVehicle(chunk, vehicle, { allowUniversal: false }),
  );

  const issues = modelSpecific
    .filter((chunk) => chunk.type === "issue" || chunk.type === "recall")
    .map(chunkToKnownIssue)
    .filter((issue): issue is KnownIssue => issue != null);

  const scoreValues = modelSpecific
    .map((chunk) => chunk.reliabilityScore)
    .filter((value): value is number => typeof value === "number");

  if (issues.length === 0 && scoreValues.length === 0) {
    return {
      available: false,
      score: null,
      notes: [
        `No tenemos evidencia suficiente para afirmar problemas conocidos específicos de ${vehicle.brand} ${vehicle.model} ${vehicle.year}.`,
      ],
      knownIssues: [],
      isDemo: false,
      source: "Base de conocimiento",
    };
  }

  const demo = anyDemo(modelSpecific);
  const score =
    scoreValues.length > 0
      ? Math.round(clamp(average(scoreValues) ?? 70, 40, 95))
      : null; // Do not invent 68/75 from issue presence alone

  const notes: string[] = [];
  if (demo) {
    notes.push(
      "Parte del corpus técnico está marcada como demo / pendiente de revisión; no lo trates como informe oficial.",
    );
  }
  if (score == null) {
    notes.push(
      `Hay menciones específicas del modelo, pero no un score de fiabilidad calibrado. Se listan patrones con evidencia de nivel A/B.`,
    );
  } else {
    notes.push(`Score orientativo a partir de fichas del modelo (no de este bastidor).`);
  }

  return {
    available: true,
    score,
    notes,
    knownIssues: issues.slice(0, 8),
    isDemo: demo,
    source: sourceLabel(modelSpecific),
  };
}

export function chunksToMaintenance(chunks: KnowledgeChunk[], vehicle?: Vehicle): MaintenanceSummary {
  const relevant = (vehicle
    ? chunks.filter((chunk) =>
        chunkIsModelSpecific(chunk) &&
        chunkMatchesVehicle(chunk, vehicle, { allowUniversal: false }),
      )
    : chunks.filter(chunkIsModelSpecific)
  );

  const maintenance = relevant.filter((chunk) => chunk.type === "maintenance");
  const inspections = relevant.filter((chunk) => chunk.type === "inspection");

  if (maintenance.length === 0 && inspections.length === 0) {
    return {
      available: false,
      notes: [
        "Sin ficha de mantenimiento específica del modelo en la base de conocimiento. No inventamos intervalos ni costes.",
      ],
      upcoming: [],
      isDemo: false,
      source: "Base de conocimiento",
    };
  }

  const demo = anyDemo([...maintenance, ...inspections]);
  // Repair cost maxima are NOT yearly maintenance — only expose if interval suggests recurring service
  const yearlyHints = maintenance.filter((chunk) =>
    /anual|año|12\s*mes|cada\s*año/i.test(
      `${chunk.maintenanceInterval ?? ""} ${chunk.title} ${chunk.content}`,
    ),
  );
  const yearlyCosts = yearlyHints
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
    isDemo: demo,
    source: sourceLabel([...maintenance, ...inspections]),
  };
}

/** Segment-level guidance (level C) — for inspection tips only, never as model issues. */
export function chunksToSegmentGuidance(
  chunks: KnowledgeChunk[],
  vehicle: Vehicle,
): { notes: string[]; isDemo: boolean } {
  const universal = chunks.filter(
    (chunk) =>
      chunkAppliesToAllBrands(chunk) &&
      chunkMatchesVehicle(chunk, vehicle, { allowUniversal: true }) &&
      (chunk.type === "inspection" || chunk.type === "maintenance"),
  );
  return {
    notes: universal.slice(0, 4).map((c) => `[Segmento] ${c.title}: ${c.content}`),
    isDemo: anyDemo(universal),
  };
}
