import type { KnowledgeChunk } from "@/types/knowledge";
import type { SharedComponentIssue, SharedComponentSummary } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import {
  chunkAppliesToAllBrands,
  chunkIsPlatformComponent,
  chunkMatchesVehicle,
} from "@/lib/rag/knowledge/filters";
import { motorCodesMatch, type VehicleComponentCodes } from "@/lib/vehicles/component-codes";

function anyDemo(chunks: KnowledgeChunk[]): boolean {
  return chunks.some((chunk) => chunk.isDemo);
}

function buildIssueDetail(chunk: KnowledgeChunk): string {
  const extra = [
    chunk.symptoms?.length ? `Síntomas habituales: ${chunk.symptoms.join("; ")}.` : null,
    chunk.askSeller?.length ? `Preguntar al vendedor: ${chunk.askSeller.join("; ")}.` : null,
    chunk.inspectSteps?.length ? `Revisar antes de comprar: ${chunk.inspectSteps.join("; ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return extra ? `${chunk.content} ${extra}` : chunk.content;
}

function matchReason(
  chunk: KnowledgeChunk,
  componentCodes: VehicleComponentCodes,
  confidence: SharedComponentIssue["matchConfidence"],
): string {
  const codes = chunk.motorCodes ?? [];
  if (confidence === "confirmed") {
    const matched = codes.filter((c) =>
      motorCodesMatch(componentCodes.codes, [c]),
    );
    return `Código coincidente (${matched.join(", ")}) con ${componentCodes.engineCode ?? "motor"} / ${componentCodes.gearboxCode ?? "caja"} del vehículo.`;
  }
  if (componentCodes.codes.length === 0) {
    return "Sin código de motor/caja confirmado: puede aplicar si tu versión lleva este componente. Confirma versión exacta.";
  }
  return "Posible coincidencia por marca, año y combustible.";
}

export function chunkToSharedComponentIssue(
  chunk: KnowledgeChunk,
  componentCodes: VehicleComponentCodes,
  matchConfidence: SharedComponentIssue["matchConfidence"],
): SharedComponentIssue | null {
  if (!chunkIsPlatformComponent(chunk)) return null;
  if (chunkAppliesToAllBrands(chunk)) return null;

  return {
    title: chunk.title,
    detail: buildIssueDetail(chunk),
    severity: chunk.severity ?? "medium",
    appliesWhen: chunk.appliesWhen ?? chunk.title,
    source: chunk.source,
    isDemo: chunk.isDemo,
    evidenceLevel: "B",
    sourceClass: chunk.isDemo ? "community" : "technical",
    confidence: matchConfidence === "confirmed" ? "medium" : "low",
    componentCodes: chunk.motorCodes ?? [],
    matchConfidence,
    matchReason: matchReason(chunk, componentCodes, matchConfidence),
  };
}

function shouldIncludePlatformChunk(
  chunk: KnowledgeChunk,
  vehicle: Vehicle,
  componentCodes: VehicleComponentCodes,
): { include: boolean; matchConfidence: SharedComponentIssue["matchConfidence"] } {
  if (!chunkMatchesVehicle(chunk, vehicle, { allowUniversal: false })) {
    return { include: false, matchConfidence: "possible" };
  }

  const chunkCodes = chunk.motorCodes ?? [];
  const hasResolvedCodes =
    componentCodes.catalogResolved ||
    componentCodes.codes.length > 0 &&
      (componentCodes.engineCode != null || componentCodes.gearboxCode != null);

  if (hasResolvedCodes && componentCodes.codes.length > 0) {
    if (motorCodesMatch(componentCodes.codes, chunkCodes)) {
      return { include: true, matchConfidence: "confirmed" };
    }
    return { include: false, matchConfidence: "possible" };
  }

  // Phase 1: sin códigos resueltos — mostrar como posible con disclaimer
  return { include: true, matchConfidence: "possible" };
}

export function chunksToSharedComponents(
  chunks: KnowledgeChunk[],
  vehicle: Vehicle,
  componentCodes: VehicleComponentCodes,
): SharedComponentSummary {
  const platformChunks = chunks.filter(chunkIsPlatformComponent);

  const issues: SharedComponentIssue[] = [];
  for (const chunk of platformChunks) {
    const { include, matchConfidence } = shouldIncludePlatformChunk(chunk, vehicle, componentCodes);
    if (!include) continue;
    const issue = chunkToSharedComponentIssue(chunk, componentCodes, matchConfidence);
    if (issue) issues.push(issue);
  }

  const sorted = issues.sort((a, b) => {
    const rank = (c: SharedComponentIssue) => (c.matchConfidence === "confirmed" ? 0 : 1);
    return rank(a) - rank(b) || (a.severity === "high" ? -1 : 0);
  });

  const codesResolved = componentCodes.catalogResolved || componentCodes.codes.length > 0;

  if (sorted.length === 0) {
    return {
      available: false,
      issues: [],
      notes: [
        codesResolved
          ? `No hay patrones de plataforma (motor/caja compartida) que coincidan con los códigos resueltos para ${vehicle.brand} ${vehicle.model}.`
          : `Sin componentes compartidos identificados para ${vehicle.brand} ${vehicle.model}. Confirma motorización en catálogo para cruce por código.`,
      ],
      isDemo: false,
      codesResolved,
      resolvedEngineCode: componentCodes.engineCode,
      resolvedGearboxCode: componentCodes.gearboxCode,
    };
  }

  const notes: string[] = [
    "Patrones de nivel B: motor o caja usados en varios modelos. No son fallos confirmados de este bastidor.",
  ];
  if (sorted.some((i) => i.matchConfidence === "possible")) {
    notes.push(
      "Entradas marcadas como «posible»: confirma que tu versión lleva ese motor/caja antes de darlas por válidas.",
    );
  }
  if (sorted.some((i) => i.isDemo)) {
    notes.push("Parte del corpus está marcada como demo / pendiente de revisión.");
  }

  return {
    available: true,
    issues: sorted.slice(0, 6),
    notes,
    isDemo: sorted.some((i) => i.isDemo),
    codesResolved,
    resolvedEngineCode: componentCodes.engineCode,
    resolvedGearboxCode: componentCodes.gearboxCode,
  };
}

export function emptySharedComponentsSummary(note: string): SharedComponentSummary {
  return {
    available: false,
    issues: [],
    notes: [note],
    isDemo: false,
    codesResolved: false,
  };
}
