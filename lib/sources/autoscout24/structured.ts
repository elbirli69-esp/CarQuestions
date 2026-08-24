export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const normalized = raw.replace(/\\u002F/g, "/");
      blocks.push(JSON.parse(normalized));
    } catch {
      // ignore malformed blocks
    }
  }
  return blocks;
}

export function findInGraph<T>(block: unknown, type: string): T | undefined {
  if (!block || typeof block !== "object") return undefined;
  const obj = block as Record<string, unknown>;
  if (obj["@type"] === type) return obj as T;
  const graph = obj["@graph"];
  if (Array.isArray(graph)) {
    for (const item of graph) {
      if (item && typeof item === "object" && (item as Record<string, unknown>)["@type"] === type) {
        return item as T;
      }
    }
  }
  return undefined;
}
