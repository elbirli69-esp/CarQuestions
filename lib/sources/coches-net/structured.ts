export interface ParsedDetailFields {
  title?: string;
  description?: string;
  price?: number;
  year?: number;
  mileage?: number;
  power?: number;
  fuel?: string;
  transmission?: string;
  location?: string;
  sellerType?: string;
  images?: string[];
  equipment?: string[];
  publicationDate?: string;
  daysOnMarket?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractJsonLd(html: string): object[] {
  const results: object[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isRecord(item)) results.push(item);
        }
      } else if (isRecord(parsed)) {
        results.push(parsed);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return results;
}

export function extractNextData(html: string): unknown | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as unknown;
  } catch {
    return null;
  }
}

function walkForListing(node: unknown, depth = 0): ParsedDetailFields | null {
  if (depth > 12 || node == null) return null;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    return null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = walkForListing(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(node)) return null;

  const type = String(node["@type"] ?? node.type ?? "").toLowerCase();
  if (type.includes("car") || type.includes("vehicle") || type.includes("product")) {
    return pickFromJsonLd(node);
  }

  for (const value of Object.values(node)) {
    const found = walkForListing(value, depth + 1);
    if (found?.description || found?.price) return found;
  }
  return null;
}

function pickFromJsonLd(item: Record<string, unknown>): ParsedDetailFields {
  const offers = isRecord(item.offers) ? item.offers : isRecord(item.Offer) ? item.Offer : null;
  const priceRaw = offers?.price ?? item.price;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number(priceRaw.replace(/[^\d.,]/g, "").replace(",", "."))
        : undefined;

  const images: string[] = [];
  const img = item.image ?? item.photo;
  if (typeof img === "string") images.push(img);
  if (Array.isArray(img)) {
    for (const entry of img) {
      if (typeof entry === "string") images.push(entry);
      if (isRecord(entry) && typeof entry.url === "string") images.push(entry.url);
    }
  }

  return {
    title: typeof item.name === "string" ? item.name : undefined,
    description: typeof item.description === "string" ? item.description : undefined,
    price: Number.isFinite(price) && price! > 0 ? Math.round(price!) : undefined,
    mileage: typeof item.mileageFromOdometer === "object" && isRecord(item.mileageFromOdometer)
      ? Number(item.mileageFromOdometer.value)
      : undefined,
    year: typeof item.vehicleModelDate === "string" ? Number(item.vehicleModelDate) : undefined,
    images: images.slice(0, 5),
  };
}

export function pickListingFromStructured(
  jsonLd: object[],
  nextData: unknown | null,
): ParsedDetailFields | null {
  for (const item of jsonLd) {
    const picked = pickFromJsonLd(item as Record<string, unknown>);
    if (picked.description || picked.price) return picked;
  }
  if (nextData) {
    const fromNext = walkForListing(nextData);
    if (fromNext) return fromNext;
  }
  return null;
}
