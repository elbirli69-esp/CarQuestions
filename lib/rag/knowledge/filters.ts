import type { KnowledgeChunk } from "@/types/knowledge";
import type { Vehicle } from "@/types/vehicle";
import { normalizeKey } from "@/lib/utils/math";

export function chunkAppliesToAllBrands(chunk: KnowledgeChunk): boolean {
  return chunk.brands.some((item) => item.trim() === "*");
}

export function chunkMatchesBrand(chunk: KnowledgeChunk, brandRaw: string): boolean {
  if (chunkAppliesToAllBrands(chunk)) return true;
  const brand = normalizeKey(brandRaw);
  if (!brand) return true;
  return chunk.brands.some((item) => {
    const key = normalizeKey(item);
    return key.length > 0 && (brand.includes(key) || key.includes(brand));
  });
}

export function chunkMatchesModel(
  chunk: KnowledgeChunk,
  modelRaw: string,
  versionRaw = "",
): boolean {
  if (!chunk.models || chunk.models.length === 0) return true;
  const model = normalizeKey(modelRaw);
  const version = normalizeKey(versionRaw);
  if (!model && !version) return true;
  return chunk.models.some((item) => {
    const key = normalizeKey(item);
    return model === key || model.includes(key) || key.includes(model) || version.includes(key);
  });
}

export function chunkMatchesVehicle(
  chunk: KnowledgeChunk,
  vehicle: Pick<Vehicle, "brand" | "model" | "year" | "fuel" | "version">,
): boolean {
  if (!chunkMatchesBrand(chunk, vehicle.brand)) return false;
  if (!chunkMatchesModel(chunk, vehicle.model, vehicle.version ?? "")) return false;

  if (chunk.fuels && chunk.fuels.length > 0 && vehicle.fuel && !chunk.fuels.includes(vehicle.fuel)) {
    return false;
  }

  if (chunk.yearFrom && vehicle.year && vehicle.year < chunk.yearFrom) return false;
  if (chunk.yearTo && vehicle.year && vehicle.year > chunk.yearTo) return false;

  return true;
}
