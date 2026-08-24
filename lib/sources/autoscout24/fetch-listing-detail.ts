import { fetchAutoScout24Html } from "@/lib/sources/autoscout24/client";
import { AutoScout24FetchError } from "@/lib/sources/autoscout24/errors";
import { parseListingHtml } from "@/lib/sources/autoscout24/parse-listing";

export async function fetchListingDetail(url: string) {
  try {
    const html = await fetchAutoScout24Html(url);
    return parseListingHtml(html, url);
  } catch (error) {
    if (error instanceof AutoScout24FetchError) return null;
    return null;
  }
}
