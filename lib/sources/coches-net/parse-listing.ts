import { parseHTML } from "linkedom";
import type { FuelType, SellerType, TransmissionType } from "@/types/vehicle";
import {
  extractJsonLd,
  extractNextData,
  pickListingFromStructured,
  type ParsedDetailFields,
} from "@/lib/sources/coches-net/structured";
import {
  inferTransmission,
  parseEuroPrice,
  parseFuel,
  parseMileage,
  parsePowerCv,
} from "@/lib/sources/coches-net/parse";

export interface ParsedCochesNetDetail extends ParsedDetailFields {
  url: string;
  fuel?: FuelType;
  transmission?: TransmissionType;
  sellerType?: SellerType;
}

const EQUIPMENT_KEYWORDS = [
  "navegador",
  "gps",
  "techo panorámico",
  "techo solar",
  "cámara",
  "sensor",
  "led",
  "xenon",
  "cuero",
  "climatizador",
  "android auto",
  "apple carplay",
  "asientos calefactados",
  "llantas",
  "park assist",
  "control crucero",
  "keyless",
  "bluetooth",
  "usb",
  "isofix",
  "garantía",
  "único dueño",
  "itv",
];

function normalizeSellerType(raw: string | undefined): SellerType | undefined {
  if (!raw) return undefined;
  const t = raw.toLowerCase();
  if (t.includes("particular")) return "private";
  if (t.includes("profesional") || t.includes("concesionario")) return "dealer";
  return undefined;
}

function extractDaysOnMarket(text: string): number | undefined {
  const match = text.match(/publicado\s+hace\s+(\d+)\s+d[ií]as/i);
  if (match?.[1]) return Number(match[1]);
  const weeks = text.match(/publicado\s+hace\s+(\d+)\s+semanas?/i);
  if (weeks?.[1]) return Number(weeks[1]) * 7;
  return undefined;
}

function detectEquipment(text: string): string[] {
  const lower = text.toLowerCase();
  return EQUIPMENT_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));
}

function mergeDetail(base: ParsedCochesNetDetail, patch: ParsedDetailFields): ParsedCochesNetDetail {
  const fuel = patch.fuel ? (parseFuel(patch.fuel) ?? base.fuel) : base.fuel;
  const transmission =
    patch.transmission === "manual" || patch.transmission === "automatic" || patch.transmission === "semi_automatic"
      ? patch.transmission
      : base.transmission;
  const sellerType =
    patch.sellerType === "private" || patch.sellerType === "dealer" || patch.sellerType === "unknown"
      ? patch.sellerType
      : base.sellerType;
  return {
    ...base,
    ...patch,
    fuel,
    transmission,
    sellerType,
    description: patch.description ?? base.description,
    equipment: [...new Set([...(base.equipment ?? []), ...(patch.equipment ?? [])])],
    images: [...new Set([...(base.images ?? []), ...(patch.images ?? [])])].slice(0, 5),
  };
}

function parseFromDom(html: string, url: string): ParsedCochesNetDetail {
  const { document } = parseHTML(html);
  const base: ParsedCochesNetDetail = { url };

  const title = document.querySelector("h1")?.textContent?.trim();
  if (title) base.title = title;

  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content");
  if (metaDesc) base.description = metaDesc.trim();

  const bodyText = document.body?.textContent ?? "";
  base.daysOnMarket = extractDaysOnMarket(bodyText);

  const listItems = [...document.querySelectorAll("li, p, span")]
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => t.length > 2 && t.length < 120);

  for (const line of listItems) {
    if (/\bkm\b/i.test(line) && !base.mileage) base.mileage = parseMileage(line);
    if (/\bcv\b/i.test(line) && !base.power) base.power = parsePowerCv(line);
    if (/^(19|20)\d{2}$/.test(line) && !base.year) base.year = Number(line);
    const f = parseFuel(line);
    if (f && !base.fuel) base.fuel = f;
  }

  const priceEl = document.querySelector('[data-testid*="price"], [class*="Price"]');
  if (priceEl?.textContent) {
    base.price = parseEuroPrice(priceEl.textContent);
  }

  const descBlocks = [...document.querySelectorAll('[class*="description"], [data-testid*="description"]')]
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => t.length > 40);
  if (descBlocks.length > 0) {
    base.description = descBlocks.join("\n").slice(0, 4000);
  }

  const textForEquipment = `${base.description ?? ""} ${bodyText}`.slice(0, 8000);
  base.equipment = detectEquipment(textForEquipment);

  const imgs = [...document.querySelectorAll("img[src]")]
    .map((img) => img.getAttribute("src") ?? "")
    .filter((src) => src.includes("ccdn.es") || src.includes("coches.net"))
    .slice(0, 5);
  if (imgs.length) base.images = imgs;

  base.sellerType = normalizeSellerType(bodyText);

  if (base.title && !base.transmission) {
    base.transmission = inferTransmission(base.title, base.title);
  }

  return base;
}

export function parseListingHtml(html: string, url: string): ParsedCochesNetDetail {
  let detail: ParsedCochesNetDetail = { url };

  const jsonLd = extractJsonLd(html);
  const nextData = extractNextData(html);
  const structured = pickListingFromStructured(jsonLd, nextData);
  if (structured) {
    detail = mergeDetail(detail, structured);
  }

  const dom = parseFromDom(html, url);
  detail = mergeDetail(detail, dom);

  return detail;
}
