import { parseFuel } from "@/lib/sources/coches-net/parse";
import type { FuelType } from "@/types/vehicle";

export function mapFuelLabel(raw: string | undefined): FuelType | undefined {
  if (!raw?.trim()) return undefined;
  return parseFuel(raw);
}

export function parseYearValue(raw: string | number | undefined): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const y = Math.round(raw);
    return y >= 1980 && y <= new Date().getFullYear() + 1 ? y : undefined;
  }
  const match = String(raw).match(/\b(19|20)\d{2}\b/);
  if (!match) return undefined;
  const y = Number(match[0]);
  return y >= 1980 && y <= new Date().getFullYear() + 1 ? y : undefined;
}

export function pickString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function pickNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[^\d.,]/g, "").replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}
