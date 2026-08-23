import type { FuelType } from "@/types/vehicle";
import { normalizeKey } from "@/lib/utils/math";

export interface VersionFamily {
  id: string;
  label: string;
  pattern: RegExp;
  brands: string[];
  impliedFuel?: FuelType;
}

export interface ModelOwnership {
  id: string;
  pattern: RegExp;
  brands: string[];
}

export const VERSION_FAMILIES: VersionFamily[] = [
  {
    id: "bmw-drive",
    label: "sDrive / xDrive / eDrive",
    pattern: /\b([se]drive|xdrive)\d{0,2}[a-z]?\b/i,
    brands: ["bmw", "mini"],
    impliedFuel: undefined,
  },
  {
    id: "vag-tdi-tsi",
    label: "TDI / TSI / TFSI",
    pattern: /\b(tdi|tsi|tfsi|tdf)\b/i,
    brands: ["volkswagen", "audi", "seat", "skoda", "cupra"],
  },
  {
    id: "renault-dci",
    label: "dCi",
    pattern: /\bdci\b/i,
    brands: ["renault", "nissan", "dacia", "infiniti", "samsung"],
    impliedFuel: "diesel",
  },
  {
    id: "mercedes-cdi",
    label: "CDI / BlueTEC",
    pattern: /\b(cdi|bluetec)\b/i,
    brands: ["mercedes", "mercedes-benz", "smart"],
    impliedFuel: "diesel",
  },
  {
    id: "psa-hdi",
    label: "HDi / BlueHDi",
    pattern: /\b(bluehdi|e-hdi|hdi)\b/i,
    brands: ["peugeot", "citroen", "ds", "opel", "vauxhall", "fiat"],
    impliedFuel: "diesel",
  },
  {
    id: "ford-tdci",
    label: "TDCi / EcoBlue",
    pattern: /\b(tdci|ecoblue)\b/i,
    brands: ["ford"],
    impliedFuel: "diesel",
  },
  {
    id: "hyundai-crdi",
    label: "CRDi",
    pattern: /\bcrdi\b/i,
    brands: ["hyundai", "kia"],
    impliedFuel: "diesel",
  },
  {
    id: "toyota-d4d",
    label: "D-4D",
    pattern: /\bd-?4d\b/i,
    brands: ["toyota", "lexus"],
    impliedFuel: "diesel",
  },
  {
    id: "mazda-skyactiv",
    label: "Skyactiv",
    pattern: /\bskyactiv\b/i,
    brands: ["mazda"],
  },
  {
    id: "ford-ecoboost",
    label: "EcoBoost",
    pattern: /\becoboost\b/i,
    brands: ["ford"],
    impliedFuel: "petrol",
  },
  {
    id: "psa-puretech",
    label: "PureTech / THP",
    pattern: /\b(puretech|thp)\b/i,
    brands: ["peugeot", "citroen", "ds", "opel"],
    impliedFuel: "petrol",
  },
];

export const MODEL_OWNERSHIP: ModelOwnership[] = [
  { id: "tesla-models", pattern: /\b(model [3ysx]|cybertruck)\b/i, brands: ["tesla"] },
  { id: "toyota-prius", pattern: /\bprius\b/i, brands: ["toyota"] },
  { id: "ebro-s800", pattern: /\bs800\b/i, brands: ["ebro"] },
  { id: "ebro-s700", pattern: /\bs700\b/i, brands: ["ebro"] },
  { id: "bmw-x1", pattern: /\bx1\b/i, brands: ["bmw"] },
  { id: "bmw-x3", pattern: /\bx3\b/i, brands: ["bmw"] },
  { id: "bmw-x5", pattern: /\bx5\b/i, brands: ["bmw"] },
];

const DIESEL_VERSION = /\b(\d{2}d|tdi|dci|cdi|hdi|bluehdi|tdci|ecoblue|crdi|d-?4d|did|bluetec)\b/i;
const PETROL_VERSION = /\b(\d{2}i|tsi|tfsi|ecoboost|puretech|thp|gdi|t-?gdi|mpi|v\d)\b/i;
const PHEV_VERSION = /\b(\d{2}e|phev|plug-?in|e-hybrid|xdrive\d{2}e)\b/i;
const ELECTRIC_VERSION = /\b(bev|kwh|edrv|electric|electrico)\b/i;
const V8_HINT = /\bv8\b/i;
const CROSS_BRAND_IN_MODEL = /\btesla\b/i;

export function brandKey(brand: string): string {
  return normalizeKey(brand).replace(/mercedes benz/g, "mercedes");
}

export function matchesBrandList(brand: string, allowed: string[]): boolean {
  const key = brandKey(brand);
  return allowed.some((item) => {
    const allowedKey = brandKey(item);
    return key === allowedKey || key.includes(allowedKey) || allowedKey.includes(key);
  });
}

export function detectVersionFamilies(version: string): VersionFamily[] {
  if (!version.trim()) return [];
  return VERSION_FAMILIES.filter((family) => family.pattern.test(version));
}

export function inferFuelFromVersion(version: string): FuelType | undefined {
  if (!version.trim()) return undefined;
  if (PHEV_VERSION.test(version) && !DIESEL_VERSION.test(version)) return "plugin_hybrid";
  if (DIESEL_VERSION.test(version)) return "diesel";
  if (ELECTRIC_VERSION.test(version)) return "electric";
  if (PETROL_VERSION.test(version)) return "petrol";
  return undefined;
}

export function detectModelOwnership(model: string): ModelOwnership | undefined {
  const text = model.trim();
  if (!text) return undefined;
  return MODEL_OWNERSHIP.find((item) => item.pattern.test(text));
}

export function versionImpliesDiesel(version: string): boolean {
  return DIESEL_VERSION.test(version);
}

export function versionImpliesPetrol(version: string): boolean {
  return PETROL_VERSION.test(version) && !DIESEL_VERSION.test(version);
}

export function versionHasV8(text: string): boolean {
  return V8_HINT.test(text);
}

export function modelMentionsOtherBrand(brand: string, model: string): boolean {
  if (!CROSS_BRAND_IN_MODEL.test(model)) return false;
  return brandKey(brand) !== "tesla";
}

export function teslaAllowsFuel(fuel: FuelType): boolean {
  return fuel === "electric";
}

export function priusAllowsPowertrain(options: {
  fuel: FuelType;
  version?: string;
  power?: number;
}): boolean {
  if (versionHasV8(`${options.version ?? ""}`)) return false;
  if (options.fuel === "diesel" || options.fuel === "electric" || options.fuel === "lpg") return false;
  if (options.power != null && options.power >= 280) return false;
  return options.fuel === "hybrid" || options.fuel === "plugin_hybrid" || options.fuel === "petrol";
}

export function typicalPowerForDieselCode(version: string): { min: number; max: number } | null {
  const match = version.toLowerCase().match(/\b(\d{2})d\b/);
  if (!match) return null;
  const code = Number(match[1]);
  if (!Number.isFinite(code)) return null;
  if (code <= 16) return { min: 90, max: 140 };
  if (code <= 18) return { min: 110, max: 170 };
  if (code <= 20) return { min: 140, max: 200 };
  if (code <= 25) return { min: 180, max: 240 };
  if (code <= 30) return { min: 220, max: 300 };
  return { min: 200, max: 400 };
}

export function isElectricFuel(fuel: FuelType): boolean {
  return fuel === "electric";
}

export function isElectrifiedFuel(fuel: FuelType): boolean {
  return fuel === "electric" || fuel === "hybrid" || fuel === "plugin_hybrid";
}

export function isCombustionFuel(fuel: FuelType): boolean {
  return fuel === "diesel" || fuel === "petrol" || fuel === "lpg" || fuel === "cng";
}
