import type { KnowledgeChunk } from "@/types/knowledge";

export function mergeKnowledgeChunks(
  base: KnowledgeChunk[],
  overlays: Partial<KnowledgeChunk>[],
): KnowledgeChunk[] {
  const overlayMap = new Map(overlays.map((item) => [item.id!, item]));

  return base.map((chunk) => {
    const overlay = overlayMap.get(chunk.id);
    if (!overlay) return chunk;
    return {
      ...chunk,
      ...overlay,
      id: chunk.id,
      brands: overlay.brands ?? chunk.brands,
      isDemo: overlay.isDemo ?? chunk.isDemo,
    };
  });
}
