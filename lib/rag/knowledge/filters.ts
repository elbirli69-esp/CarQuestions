import type { KnowledgeChunk } from "@/types/knowledge";
import type { Vehicle } from "@/types/vehicle";
import { normalizeKey } from "@/lib/utils/math";

export function chunkAppliesToAllBrands(chunk: KnowledgeChunk): boolean {
  return chunk.brands.some((item) => item.trim() === "*");
}

function exactOrAliasMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // Allow "x1" vs "x 1" style only when both sides are short codes
  const compact = (s: string) => s.replace(/\s+/g, "");
  return compact(a) === compact(b);
}

export function chunkMatchesBrand(chunk: KnowledgeChunk, brandRaw: string): boolean {
  if (chunkAppliesToAllBrands(chunk)) return true;
  const brand = normalizeKey(brandRaw);
  if (!brand) return false;
  return chunk.brands.some((item) => {
    const key = normalizeKey(item);
    if (!key || key === "*") return false;
    // Prefer exact / alias; avoid "mini" matching inside unrelated brands via includes alone
    return exactOrAliasMatch(brand, key) || brand.startsWith(`${key} `) || key.startsWith(`${brand} `);
  });
}

/**
 * Model matching for model-specific knowledge.
 * Does NOT use version to unlock another model's chunks (prevents sDrive18d → BMW X1 leakage).
 */
export function chunkMatchesModel(
  chunk: KnowledgeChunk,
  modelRaw: string,
  _versionRaw = "",
): boolean {
  if (!chunk.models || chunk.models.length === 0) return true;
  const model = normalizeKey(modelRaw);
  if (!model) return false;
  return chunk.models.some((item) => {
    const key = normalizeKey(item);
    if (!key) return false;
    return exactOrAliasMatch(model, key);
  });
}

export function chunkMatchesMileage(chunk: KnowledgeChunk, mileage?: number): boolean {
  if (mileage == null) return true;
  if (chunk.typicalKmFrom != null && mileage < chunk.typicalKmFrom * 0.5) return false;
  if (chunk.typicalKmTo != null && mileage > chunk.typicalKmTo * 1.5) return false;
  return true;
}

export function chunkMatchesVehicle(
  chunk: KnowledgeChunk,
  vehicle: Pick<Vehicle, "brand" | "model" | "year" | "fuel" | "version" | "mileage">,
  options?: { allowUniversal?: boolean },
): boolean {
  const allowUniversal = options?.allowUniversal ?? true;
  if (chunkAppliesToAllBrands(chunk) && !allowUniversal) return false;

  if (!chunkMatchesBrand(chunk, vehicle.brand)) return false;
  if (!chunkMatchesModel(chunk, vehicle.model, vehicle.version ?? "")) return false;

  if (chunk.fuels && chunk.fuels.length > 0 && vehicle.fuel && !chunk.fuels.includes(vehicle.fuel)) {
    return false;
  }

  if (chunk.yearFrom && vehicle.year && vehicle.year < chunk.yearFrom) return false;
  if (chunk.yearTo && vehicle.year && vehicle.year > chunk.yearTo) return false;
  if (!chunkMatchesMileage(chunk, vehicle.mileage)) return false;

  return true;
}

/** Model-specific only: brand+model scoped, never universal. */
export function chunkIsModelSpecific(chunk: KnowledgeChunk): boolean {
  if (chunkAppliesToAllBrands(chunk)) return false;
  return Boolean(chunk.models && chunk.models.length > 0);
}

/**
 * Platform / shared component chunk: motor or gearbox code scoped, not tied to a single model.
 * Used for nivel B (shared drivetrain issues across models).
 */
export function chunkIsPlatformComponent(chunk: KnowledgeChunk): boolean {
  if (chunkAppliesToAllBrands(chunk)) return false;
  if (chunkIsModelSpecific(chunk)) return false;
  if (!chunk.motorCodes || chunk.motorCodes.length === 0) return false;
  return chunk.type === "issue" || chunk.type === "recall";
}
