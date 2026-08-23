/**
 * SSRF / URL policy for coches.net listing scrapes.
 * Only https://(www.)coches.net listing paths are allowed.
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
    // Listing paths typically include /detalle/ or brand/model segments; reject bare root
    if (url.pathname.length < 4) return false;
    if (url.username || url.password) return false;
    return true;
  } catch {
    return false;
  }
}
