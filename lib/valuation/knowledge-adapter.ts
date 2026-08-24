import type { KnownIssue, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";
import type { TechnicalKnowledge } from "@/types/technical";

/** Convierte TechnicalKnowledge al ReliabilitySummary legacy para el chat y tarjetas antiguas. */
export function knowledgeToReliability(knowledge: TechnicalKnowledge): ReliabilitySummary {
  if (knowledge.status === "blocked") {
    return {
      available: false,
      score: null,
      notes: knowledge.notes,
      knownIssues: [],
      isDemo: false,
      source: "Base de conocimiento curada",
    };
  }

  const issues: KnownIssue[] = [...knowledge.modelSpecific, ...knowledge.platformShared].map(
    (finding) => ({
      title: finding.title,
      detail: finding.detail,
      severity: finding.severity,
      appliesWhen: finding.appliesWhen,
      source: finding.evidence.source,
      isDemo: false,
    }),
  );

  return {
    available: issues.length > 0 || knowledge.reliability.score != null,
    score: knowledge.reliability.score,
    notes: [knowledge.headline, ...knowledge.notes].slice(0, 4),
    knownIssues: issues.slice(0, 8),
    isDemo: false,
    source: "Base de conocimiento curada (RAG)",
  };
}

export function knowledgeToMaintenance(knowledge: TechnicalKnowledge): MaintenanceSummary {
  if (!knowledge.maintenance.available) {
    return {
      available: false,
      notes: knowledge.maintenance.notes,
      upcoming: [],
      isDemo: false,
      source: "Base de conocimiento curada",
    };
  }

  return {
    available: true,
    notes: knowledge.maintenance.items.map((item) => `${item.title}: ${item.detail}`).slice(0, 4),
    upcoming: knowledge.maintenance.items
      .map((item) => item.interval)
      .filter((v): v is string => Boolean(v))
      .slice(0, 6),
    estimatedYearlyCost: knowledge.maintenance.estimatedYearlyCostEur ?? undefined,
    isDemo: false,
    source: "Base de conocimiento curada (RAG)",
  };
}
