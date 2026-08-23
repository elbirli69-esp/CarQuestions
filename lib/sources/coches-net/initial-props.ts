/**
 * Lectura del estado de hidratación de las páginas de resultados de coches.net.
 *
 * Las páginas de búsqueda incrustan `window.__INITIAL_PROPS__ = JSON.parse("…")`
 * con ~35 anuncios completos por página, mientras que las cards SSR solo dejan
 * ~7 parseables por regex. Las fichas individuales (`*-covo.aspx`) están detrás
 * de un challenge JS, así que este JSON es la fuente principal de datos.
 */

import { cochesNetApiAdSchema, type CochesNetSearchResults } from "@/lib/sources/coches-net/api-types";

const MARKER = "window.__INITIAL_PROPS__";
const PARSE_PREFIX = 'JSON.parse("';
/** Margen entre el marcador y `JSON.parse("` para no engancharse a otro script. */
const MAX_MARKER_GAP = 80;

/**
 * Extrae el literal de string que recibe `JSON.parse`, respetando escapes.
 * No sirve una regex perezosa porque el contenido lleva `\"` por todas partes.
 */
function readJsStringLiteral(html: string): string | null {
  const markerIdx = html.indexOf(MARKER);
  if (markerIdx < 0) return null;

  const parseIdx = html.indexOf(PARSE_PREFIX, markerIdx);
  if (parseIdx < 0 || parseIdx - markerIdx > MAX_MARKER_GAP) return null;

  const start = parseIdx + PARSE_PREFIX.length;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (char === "\\") {
      i += 1;
      continue;
    }
    if (char === '"') {
      return html.slice(start, i);
    }
  }
  return null;
}

export function extractInitialProps(html: string): unknown | null {
  const literal = readJsStringLiteral(html);
  if (!literal) return null;

  try {
    const jsonText = JSON.parse(`"${literal}"`) as string;
    return JSON.parse(jsonText) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Devuelve los anuncios del JSON de hidratación, o `null` si la página no lo
 * trae (en ese caso el llamante debe recurrir al parser de cards por regex).
 */
export function parseSearchResults(html: string): CochesNetSearchResults | null {
  const props = extractInitialProps(html);
  if (!isRecord(props)) return null;

  const results = props.initialResults;
  if (!isRecord(results) || !Array.isArray(results.items)) return null;

  const items: CochesNetSearchResults["items"] = [];
  let invalidCount = 0;

  for (const raw of results.items) {
    const parsed = cochesNetApiAdSchema.safeParse(raw);
    if (parsed.success) {
      items.push(parsed.data);
    } else {
      invalidCount += 1;
    }
  }

  if (items.length === 0) return null;

  return {
    items,
    totalResults: typeof results.totalResults === "number" ? results.totalResults : undefined,
    totalPages: typeof results.totalPages === "number" ? results.totalPages : undefined,
    invalidCount,
  };
}
