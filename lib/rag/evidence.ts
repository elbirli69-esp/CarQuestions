import type { ClaimSourceKind, EvidenceLevel } from "@/types/evidence";
import type { KnowledgeChunk } from "@/types/knowledge";
import type { Vehicle } from "@/types/vehicle";
import { chunkAppliesToAllBrands, chunkMatchesBrand, chunkMatchesModel } from "@/lib/rag/knowledge/filters";
import { normalizeKey } from "@/lib/utils/math";

export function classifyChunkEvidence(
  chunk: KnowledgeChunk,
  vehicle: Pick<Vehicle, "brand" | "model" | "version" | "year" | "fuel">,
): EvidenceLevel {
  const universal = chunkAppliesToAllBrands(chunk);
  const brandHit = !universal && chunkMatchesBrand(chunk, vehicle.brand);
  const hasModels = Boolean(chunk.models && chunk.models.length > 0);
  const modelHit = hasModels && chunkMatchesModel(chunk, vehicle.model, vehicle.version ?? "");

  if (brandHit && modelHit) return "A";
  if (brandHit && !hasModels) return "B";
  if (brandHit && hasModels && !modelHit) return "C";
  if (universal) return "C";
  return "D";
}

export function classifySourceKind(chunk: KnowledgeChunk): ClaimSourceKind {
  const text = `${chunk.source} ${chunk.sourceUrl ?? ""}`.toLowerCase();
  if (/dgt|itv|boe|gobierno|nhtsa|recall oficial/.test(text)) return "government";
  if (/manual|taller oficial|fabricante|oem|bmw ag|toyota/.test(text)) return "manufacturer";
  if (/faq|foro|owners|comunidad|club/.test(text)) return "community";
  if (/diagnosis|tsb|taller|t[eé]cnic/.test(text)) return "technical";
  return "technical";
}

export function chunkMatchesModelStrict(
  chunk: KnowledgeChunk,
  modelRaw: string,
  versionRaw = "",
): boolean {
  if (!chunk.models || chunk.models.length === 0) return false;
  const model = normalizeKey(modelRaw);
  const version = normalizeKey(versionRaw);
  if (!model && !version) return false;
  return chunk.models.some((item) => {
    const key = normalizeKey(item);
    return model === key || model.includes(key) || key.includes(model) || (version.length > 0 && version.includes(key));
  });
}
