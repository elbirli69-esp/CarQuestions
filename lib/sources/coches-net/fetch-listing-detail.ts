/**
 * Lectura de la ficha individual de un anuncio.
 *
 * ATENCIÓN: coches.net protege las páginas `*-covo.aspx` con un challenge JS
 * (PerimeterX), así que esto devuelve `null` de forma sistemática: 405 con GET
 * normal, 403 con UA de buscador y challenge incluso con cabeceras completas.
 * Por eso el flujo de análisis y de extracción por URL **no** llama aquí, y usa
 * el JSON de los resultados de búsqueda (`initial-props.ts`), que trae los
 * mismos datos salvo la descripción libre y el equipamiento detallado.
 *
 * Se mantiene el módulo para cuando haya una vía viable (navegador headless o
 * cookie de sesión reutilizable).
 */

import { fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import { CochesNetFetchError } from "@/lib/sources/coches-net/errors";
import { parseListingHtml, type ParsedCochesNetDetail } from "@/lib/sources/coches-net/parse-listing";

export async function fetchListingDetail(url: string): Promise<ParsedCochesNetDetail | null> {
  try {
    const html = await fetchCochesNetHtml(url);
    const detail = parseListingHtml(html, url);
    const hasData =
      detail.price != null ||
      detail.mileage != null ||
      (detail.description && detail.description.length > 30) ||
      (detail.equipment && detail.equipment.length > 0);
    return hasData ? detail : null;
  } catch (error) {
    if (error instanceof CochesNetFetchError) {
      return null;
    }
    throw error;
  }
}
