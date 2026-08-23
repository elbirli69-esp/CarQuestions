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
