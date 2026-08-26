import trimsData from "@/data/vehicle-trims.json";
import { normalizeCatalogKey } from "@/lib/vehicles/catalog-types";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicles/labels";
import type { CatalogTrim, TrimCatalogEntry, VehicleTrimCatalog } from "@/lib/vehicles/trims-types";
import type { FuelType, TransmissionType } from "@/types/vehicle";

const catalog = trimsData as VehicleTrimCatalog;

const CUSTOM_TRIM_SLUG = "__custom__";

export function getTrimCatalog(): VehicleTrimCatalog {
  return catalog;
}

export function getTrimsForModel(brandSlug: string, modelSlug: string): CatalogTrim[] {
  const entry = catalog.entries.find(
    (e) => e.brandSlug === brandSlug && e.modelSlug === modelSlug,
  );
  return entry?.trims ?? [];
}

export function findTrimBySlug(
  brandSlug: string,
  modelSlug: string,
  trimSlug: string,
): CatalogTrim | undefined {
  return getTrimsForModel(brandSlug, modelSlug).find((t) => t.slug === trimSlug);
}

/** Match free-text version to a catalog trim (exact name or slug). */
export function findTrimByVersionText(
  brandSlug: string,
  modelSlug: string,
  version: string,
): CatalogTrim | undefined {
  const key = normalizeCatalogKey(version);
  if (!key) return undefined;
  const trims = getTrimsForModel(brandSlug, modelSlug);
  return trims.find((trim) => {
    const nameKey = normalizeCatalogKey(trim.name);
    const slugKey = normalizeCatalogKey(trim.slug.replace(/-/g, " "));
    return key === nameKey || key === slugKey || nameKey.includes(key) || key.includes(nameKey);
  });
}

/** If trim exists for another brand, return that entry (foreign trim). */
export function findTrimOwnedByOtherBrand(
  trimSlugOrName: string,
  brandSlug: string,
): { entry: TrimCatalogEntry; trim: CatalogTrim } | undefined {
  const key = normalizeCatalogKey(trimSlugOrName);
  for (const entry of catalog.entries) {
    if (entry.brandSlug === brandSlug) continue;
    const hit = entry.trims.find(
      (t) =>
        t.slug === trimSlugOrName ||
        normalizeCatalogKey(t.name) === key ||
        normalizeCatalogKey(t.slug.replace(/-/g, " ")) === key,
    );
    if (hit) return { entry, trim: hit };
  }
  return undefined;
}

export interface ResolvedTrimFields {
  version: string;
  fuel?: FuelType;
  power?: number;
  transmission?: TransmissionType;
  engineCode?: string;
  trimSlug?: string;
  trimCatalogMatch: boolean;
  gearboxCode?: string;
}

/**
 * Apply catalog trim to vehicle fields (evidence chain: catalog → canonical fields).
 */
export function resolveTrimSelection(options: {
  brandSlug: string;
  modelSlug: string;
  trimSlug?: string;
  versionText?: string;
  fuel?: FuelType;
  power?: number;
  transmission?: TransmissionType;
  year?: number;
}): ResolvedTrimFields & { trim?: CatalogTrim } {
  const { brandSlug, modelSlug, trimSlug, versionText } = options;
  let trim: CatalogTrim | undefined;

  if (trimSlug && trimSlug !== CUSTOM_TRIM_SLUG) {
    trim = findTrimBySlug(brandSlug, modelSlug, trimSlug);
  } else if (versionText?.trim()) {
    trim = findTrimByVersionText(brandSlug, modelSlug, versionText);
  }

  if (!trim) {
    return {
      version: versionText?.trim() ?? "",
      trimCatalogMatch: false,
    };
  }

  return {
    version: trim.name,
    fuel: options.fuel ?? trim.fuel,
    power: options.power ?? trim.powerHp,
    transmission: options.transmission ?? trim.transmission,
    engineCode: trim.engineCode,
    gearboxCode: trim.gearboxCode,
    trimSlug: trim.slug,
    trimCatalogMatch: true,
    trim,
  };
}

function formatTrimYearRange(trim: CatalogTrim): string | undefined {
  if (trim.yearFrom == null) return undefined;
  if (trim.yearTo != null && trim.yearTo !== trim.yearFrom) {
    return `${trim.yearFrom}–${trim.yearTo}`;
  }
  return `${trim.yearFrom}+`;
}

function labelImpliesTransmission(label: string, transmission: TransmissionType): boolean {
  const lower = label.toLowerCase();
  if (transmission === "automatic") {
    return (
      lower.includes("automático") ||
      lower.includes("automatic") ||
      lower.includes("dsg") ||
      lower.includes("cvt") ||
      lower.includes("tiptronic") ||
      lower.includes("e-cvt")
    );
  }
  if (transmission === "manual") {
    return lower.includes("manual");
  }
  if (transmission === "semi_automatic") {
    return lower.includes("semiautomático") || lower.includes("semi-automatic");
  }
  return false;
}

/** Primary line for version dropdown (commercial name + key specs). */
export function trimLabel(trim: CatalogTrim): string {
  if (trim.label) return trim.label;

  const parts: string[] = [trim.name];
  if (trim.powerHp != null) parts.push(`${trim.powerHp} CV`);
  if (trim.fuel) parts.push(FUEL_LABELS[trim.fuel]);
  if (trim.transmission) parts.push(TRANSMISSION_LABELS[trim.transmission]);
  return parts.join(" · ");
}

/** Secondary line: years, engine and gearbox codes when known. */
export function trimDescription(trim: CatalogTrim): string | undefined {
  const parts: string[] = [];
  const years = formatTrimYearRange(trim);
  if (years) parts.push(years);
  if (trim.engineCode) parts.push(trim.engineCode);
  if (trim.gearboxCode) parts.push(trim.gearboxCode);

  const labelLower = trim.label?.toLowerCase() ?? "";
  if (
    trim.transmission &&
    !labelImpliesTransmission(labelLower, trim.transmission)
  ) {
    parts.push(TRANSMISSION_LABELS[trim.transmission]);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export { CUSTOM_TRIM_SLUG };
