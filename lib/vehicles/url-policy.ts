/**
 * SSRF / URL policy for listing scrapes (coches.net + AutoScout24).
 */
export function isAllowedCochesNetListingUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "metadata.google.internal") {
      return false;
    }
    if (host !== "www.coches.net" && host !== "coches.net") return false;
    if (url.pathname.length < 4) return false;
    if (url.username || url.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function isAllowedAutoScout24ListingUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "metadata.google.internal") {
      return false;
    }
    if (!host.endsWith("autoscout24.es") && !host.endsWith("autoscout24.com")) return false;
    if (!url.pathname.includes("/anuncios/")) return false;
    if (
      !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(url.pathname)
    ) {
      return false;
    }
    if (url.username || url.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function isAllowedListingUrl(raw: string): boolean {
  return isAllowedCochesNetListingUrl(raw) || isAllowedAutoScout24ListingUrl(raw);
}
