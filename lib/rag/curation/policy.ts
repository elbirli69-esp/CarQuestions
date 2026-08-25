import type { KnowledgeChunk, KnowledgeVerificationLevel } from "@/types/knowledge";
import { KNOWLEDGE_VERIFICATION_LEVELS } from "@/types/knowledge";

/** Niveles que permiten isDemo=false (fuente verificable, no solo foro genérico). */
export const CURATED_VERIFICATION_LEVELS: readonly KnowledgeVerificationLevel[] = [
  "safety_gate_alert",
  "safety_gate_portal",
  "oem_recall",
  "oem_tsb",
  "regulatory",
  "reliability_report",
  "oem_manual",
  "technical_literature",
];

const FORUM_ROOT_PATTERNS = [
  /^https?:\/\/(www\.)?bmwfaq\.org\/?$/i,
  /^https?:\/\/(www\.)?golfmk7\.com\/?$/i,
  /^https?:\/\/(www\.)?volkswagenforum\.com\/?$/i,
  /^https?:\/\/(www\.)?audisport\.net\/?$/i,
];

const SAFETY_GATE_HOST = /ec\.europa\.eu/i;

export interface CurationValidationError {
  chunkId: string;
  message: string;
}

export function isCuratedVerificationLevel(level: string): level is KnowledgeVerificationLevel {
  return (KNOWLEDGE_VERIFICATION_LEVELS as readonly string[]).includes(level);
}

export function allowsNonDemo(level: KnowledgeVerificationLevel): boolean {
  return CURATED_VERIFICATION_LEVELS.includes(level);
}

function isBareForumHomepage(url: string): boolean {
  return FORUM_ROOT_PATTERNS.some((re) => re.test(url.trim()));
}

function isSafetyGateUrl(url: string): boolean {
  try {
    return SAFETY_GATE_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isSpecificSafetyGateAlert(url: string): boolean {
  return /safety-gate/i.test(url) && /alert|reference|screen\/alert/i.test(url);
}

export function suggestVerificationLevel(chunk: KnowledgeChunk): KnowledgeVerificationLevel | null {
  const url = chunk.sourceUrl?.trim();
  if (!url) return null;
  if (isSafetyGateUrl(url)) {
    return isSpecificSafetyGateAlert(url) ? "safety_gate_alert" : "safety_gate_portal";
  }
  if (chunk.type === "recall") return "oem_recall";
  if (/adac|tüv|tuv/i.test(chunk.source ?? "") || /adac\.de|tuv\.com/i.test(url)) {
    return "reliability_report";
  }
  if (isBareForumHomepage(url)) return null;
  return "technical_literature";
}

export function validateChunkCuration(chunk: KnowledgeChunk): CurationValidationError[] {
  const errors: CurationValidationError[] = [];

  if (chunk.isDemo) {
    if (chunk.verificationLevel && chunk.curatedAt) {
      errors.push({
        chunkId: chunk.id,
        message: "Chunk demo con curatedAt/verificationLevel — quitar isDemo o limpiar metadatos de curación.",
      });
    }
    return errors;
  }

  if (!chunk.curatedAt) {
    errors.push({ chunkId: chunk.id, message: "isDemo=false requiere curatedAt (ISO)." });
  }

  if (!chunk.verificationLevel) {
    errors.push({ chunkId: chunk.id, message: "isDemo=false requiere verificationLevel." });
  } else if (!isCuratedVerificationLevel(chunk.verificationLevel)) {
    errors.push({
      chunkId: chunk.id,
      message: `verificationLevel inválido: ${chunk.verificationLevel}`,
    });
  } else if (!allowsNonDemo(chunk.verificationLevel)) {
    errors.push({
      chunkId: chunk.id,
      message: `verificationLevel ${chunk.verificationLevel} no permite isDemo=false.`,
    });
  }

  const url = chunk.sourceUrl?.trim();
  if (!url) {
    errors.push({ chunkId: chunk.id, message: "isDemo=false requiere sourceUrl https verificable." });
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        errors.push({ chunkId: chunk.id, message: "sourceUrl debe ser http(s)." });
      }
    } catch {
      errors.push({ chunkId: chunk.id, message: "sourceUrl no es una URL válida." });
    }
    if (url && isBareForumHomepage(url)) {
      errors.push({
        chunkId: chunk.id,
        message:
          "sourceUrl es solo la home de un foro; enlaza a hilo concreto, TSB o documento OEM antes de quitar isDemo.",
      });
    }
  }

  if (
    chunk.verificationLevel === "safety_gate_alert" &&
    url &&
    !isSpecificSafetyGateAlert(url)
  ) {
    errors.push({
      chunkId: chunk.id,
      message:
        "verificationLevel=safety_gate_alert requiere URL de alerta concreta (no solo el buscador Safety Gate).",
    });
  }

  if (
    (chunk.verificationLevel === "reliability_report" || chunk.verificationLevel === "oem_recall") &&
    !chunk.externalRef?.trim()
  ) {
    errors.push({
      chunkId: chunk.id,
      message: "reliability_report / oem_recall requieren externalRef (año informe o ID campaña).",
    });
  }

  return errors;
}

export function validateCorpusCuration(chunks: KnowledgeChunk[]): CurationValidationError[] {
  return chunks.flatMap((chunk) => validateChunkCuration(chunk));
}
