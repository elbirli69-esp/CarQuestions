import type { EvidenceLevel, EvidenceRef } from "@/types/evidence";
import type { VehicleIdentity } from "@/types/identity";
import type {
  KnowledgeCoverage,
  MaintenanceGuidance,
  ReliabilityAssessment,
  TechnicalFinding,
  TechnicalKnowledge,
  TechnicalKnowledgeStatus,
} from "@/types/technical";
import { average, clamp } from "@/lib/utils/math";
import { retrieveScopedKnowledge, type ScoredRelevance } from "@/lib/rag/knowledge/retrieve";

const MAX_PER_LEVEL = 6;

function toEvidence(hit: ScoredRelevance): EvidenceRef {
  return {
    level: hit.evidenceLevel,
    sourceType: hit.sourceType,
    source: hit.chunk.source,
    sourceUrl: hit.chunk.sourceUrl,
    matchedOn: hit.matchedOn,
  };
}

function toFinding(hit: ScoredRelevance): TechnicalFinding {
  const chunk = hit.chunk;
  return {
    id: chunk.id,
    title: chunk.title,
    detail: chunk.content,
    severity: chunk.severity ?? "medium",
    evidence: toEvidence(hit),
    appliesWhen: chunk.appliesWhen ?? chunk.title,
    symptoms: chunk.symptoms ?? [],
    chunkType: chunk.type,
    estimatedCostEur: chunk.estimatedCostEur,
  };
}

function emptyMaintenance(note: string): MaintenanceGuidance {
  return {
    available: false,
    evidenceLevel: null,
    items: [],
    estimatedYearlyCostEur: null,
    notes: [note],
  };
}

function buildMaintenance(hits: ScoredRelevance[]): MaintenanceGuidance {
  // El mantenimiento solo se presenta cuando procede del modelo o su mecánica.
  // El nivel C se reserva para el checklist genérico, no para "tu plan de
  // mantenimiento", porque induciría a pensar que son intervalos de este coche.
  const relevant = hits.filter(
    (hit) =>
      (hit.chunk.type === "maintenance" || hit.chunk.type === "inspection") &&
      hit.evidenceLevel !== "C",
  );

  if (relevant.length === 0) {
    return emptyMaintenance(
      "No tenemos un plan de mantenimiento documentado para esta motorización concreta. Pide el libro de revisiones y el plan oficial de la marca.",
    );
  }

  const items = relevant.slice(0, 6).map((hit) => ({
    title: hit.chunk.title,
    detail: hit.chunk.content,
    interval: hit.chunk.maintenanceInterval,
    evidence: toEvidence(hit),
    estimatedCostEur: hit.chunk.estimatedCostEur,
  }));

  const costs = relevant
    .map((hit) => hit.chunk.estimatedCostEur?.max ?? hit.chunk.estimatedCostEur?.min)
    .filter((value): value is number => typeof value === "number");

  const best: EvidenceLevel = relevant.some((hit) => hit.evidenceLevel === "A") ? "A" : "B";

  return {
    available: true,
    evidenceLevel: best,
    items,
    estimatedYearlyCostEur: costs.length >= 2 ? Math.round(average(costs) ?? 0) : null,
    notes:
      costs.length >= 2
        ? ["Los costes son órdenes de magnitud de intervenciones documentadas, no un presupuesto de este coche."]
        : ["No hay suficientes costes documentados para dar una cifra anual. Pide presupuesto en taller."],
  };
}

function buildReliability(hits: ScoredRelevance[]): ReliabilityAssessment {
  // Solo puntúa la evidencia atribuible al vehículo (A/B). Un fragmento de
  // segmento no puede sostener un "score de fiabilidad de este modelo".
  const scored = hits.filter(
    (hit) => hit.evidenceLevel !== "C" && typeof hit.chunk.reliabilityScore === "number",
  );

  if (scored.length === 0) {
    return {
      score: null,
      evidenceLevel: null,
      basis:
        "No hay suficientes datos documentados de este modelo y motor para dar una nota de fiabilidad.",
      sampleSize: 0,
    };
  }

  const values = scored.map((hit) => hit.chunk.reliabilityScore as number);
  const level: EvidenceLevel = scored.some((hit) => hit.evidenceLevel === "A") ? "A" : "B";

  return {
    score: Math.round(clamp(average(values) ?? 70, 30, 95)),
    evidenceLevel: level,
    basis:
      level === "A"
        ? `Media de ${scored.length} fichas documentadas de este modelo y motorización.`
        : `Media de ${scored.length} fichas de la marca o de mecánica compartida. No es específica de esta versión.`,
    sampleSize: scored.length,
  };
}

function statusFrom(
  modelSpecific: TechnicalFinding[],
  platformShared: TechnicalFinding[],
  segmentContext: TechnicalFinding[],
): TechnicalKnowledgeStatus {
  if (modelSpecific.length > 0) return "specific";
  if (platformShared.length > 0) return "platform";
  if (segmentContext.length > 0) return "segment_only";
  return "none";
}

function headlineFor(status: TechnicalKnowledgeStatus, label: string): string {
  switch (status) {
    case "specific":
      return `Tenemos patrones documentados específicos de ${label}.`;
    case "platform":
      return `No hay fichas de esta versión concreta, pero sí de la marca y de mecánica compartida. Trátalo como indicio, no como diagnóstico.`;
    case "segment_only":
      return `No tenemos evidencia suficiente para afirmar que algo sea un problema conocido de ${label}. Solo podemos ofrecerte comprobaciones generales del segmento.`;
    case "blocked":
      return "Los datos del vehículo se contradicen entre sí. No generamos conocimiento técnico hasta resolverlo: cualquier cosa que dijéramos sería inventada.";
    default:
      return `No hay conocimiento aplicable a ${label} en nuestra base. Preferimos decirlo a rellenarlo con datos genéricos.`;
  }
}

function blocked(identity: VehicleIdentity): TechnicalKnowledge {
  const conflicts = identity.issues
    .filter((issue) => issue.severity === "blocking")
    .map((issue) => issue.message);

  return {
    status: "blocked",
    headline: headlineFor("blocked", identity.label),
    modelSpecific: [],
    platformShared: [],
    segmentContext: [],
    maintenance: emptyMaintenance(
      "Sin una identificación fiable del vehículo no podemos indicar mantenimiento.",
    ),
    reliability: {
      score: null,
      evidenceLevel: null,
      basis: "Identificación del vehículo no válida.",
      sampleSize: 0,
    },
    coverage: {
      totalChunks: 0,
      applicable: 0,
      excluded: 0,
      byLevel: { A: 0, B: 0, C: 0, D: 0 },
      topExclusions: [],
    },
    notes: conflicts,
  };
}

/**
 * Conocimiento técnico del vehículo, separado por nivel de evidencia.
 *
 * Reglas duras:
 *  - si la identidad del vehículo es incoherente, no se genera nada;
 *  - el nivel C nunca se presenta como "problema conocido del modelo";
 *  - la nota de fiabilidad solo existe si hay fichas de nivel A o B.
 */
export function buildTechnicalKnowledge(identity: VehicleIdentity): TechnicalKnowledge {
  if (!identity.safeForTechnicalKnowledge) return blocked(identity);

  const retrieval = retrieveScopedKnowledge(identity.canonical, { limit: 40 });
  const issueHits = retrieval.hits.filter(
    (hit) => hit.chunk.type === "issue" || hit.chunk.type === "recall",
  );

  const modelSpecific = issueHits
    .filter((hit) => hit.evidenceLevel === "A")
    .slice(0, MAX_PER_LEVEL)
    .map(toFinding);
  const platformShared = issueHits
    .filter((hit) => hit.evidenceLevel === "B")
    .slice(0, MAX_PER_LEVEL)
    .map(toFinding);
  const segmentContext = issueHits
    .filter((hit) => hit.evidenceLevel === "C")
    .slice(0, 4)
    .map(toFinding);

  const status = statusFrom(modelSpecific, platformShared, segmentContext);

  const topExclusions = Object.entries(retrieval.stats.exclusionReasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const coverage: KnowledgeCoverage = {
    totalChunks: retrieval.stats.total,
    applicable: retrieval.stats.applicable,
    excluded: retrieval.stats.excluded,
    byLevel: retrieval.stats.byLevel,
    topExclusions,
  };

  const notes: string[] = [];
  if (modelSpecific.length === 0 && platformShared.length > 0) {
    notes.push(
      "Ninguno de estos patrones está documentado para tu versión exacta: proceden de la marca o de mecánica compartida.",
    );
  }
  if (modelSpecific.length === 0 && platformShared.length === 0) {
    notes.push(
      "No presentamos nada como avería conocida de este modelo porque no tenemos evidencia que lo sostenga.",
    );
  }
  if (segmentContext.length > 0) {
    notes.push(
      "Lo listado como contexto de segmento son comprobaciones habituales en coches parecidos, no fallos atribuidos a este.",
    );
  }

  return {
    status,
    headline: headlineFor(status, identity.label),
    modelSpecific,
    platformShared,
    segmentContext,
    maintenance: buildMaintenance(retrieval.hits),
    reliability: buildReliability(retrieval.hits),
    coverage,
    notes,
  };
}

/** Todos los hallazgos con evidencia atribuible al vehículo (A y B). */
export function attributableFindings(knowledge: TechnicalKnowledge): TechnicalFinding[] {
  return [...knowledge.modelSpecific, ...knowledge.platformShared];
}
