import type { KnowledgeChunk } from "@/types/knowledge";
import type { FuelType, Vehicle } from "@/types/vehicle";
import { isElectricFuel } from "@/lib/vehicles/identity";
import { normalizeKey } from "@/lib/utils/math";

const ICE_ONLY =
  /\b(ckp|cmp|maf|map|lambda|knock|rail|egr|fap|dpf|turbo|inyector|distribuci[oó]n|culata|hpfp|gdi|wet belt|bimasa|adblue|scr|nox|common.?rail|octanaje)\b/i;
const EV_ONLY =
  /\b(soh|bater[ií]a hv|hv battery|heat pump|bomba de calor|octovalve|brake-by-wire|preacondicion|preconditioning|pack estructural|carga dc)\b/i;

export function chunkCompatibleWithDrivetrain(
  chunk: KnowledgeChunk,
  version?: string,
  model?: string,
): boolean {
  const haystack = `${chunk.title} ${chunk.content} ${chunk.tags?.join(" ") ?? ""} ${chunk.models?.join(" ") ?? ""}`;
  const versionText = `${version ?? ""} ${model ?? ""}`;
  const isSdrive = /\bsdrive/i.test(versionText) && !/\bxdrive/i.test(versionText);
  const isXdriveChunk = /\bxdrive|caja de transferencia|transfer case|atc\b/i.test(haystack);
  if (isSdrive && isXdriveChunk) return false;
  return true;
}

export function chunkCompatibleWithFuel(chunk: KnowledgeChunk, fuel?: FuelType): boolean {
  if (!fuel) return true;
  if (chunk.fuels && chunk.fuels.length > 0) return chunk.fuels.includes(fuel);

  const haystack = `${chunk.title} ${chunk.content} ${chunk.tags?.join(" ") ?? ""}`;
  if (isElectricFuel(fuel) && ICE_ONLY.test(haystack) && !EV_ONLY.test(haystack)) return false;
  if ((fuel === "petrol" || fuel === "diesel" || fuel === "lpg" || fuel === "cng") && EV_ONLY.test(haystack)) {
    return false;
  }
  if (fuel === "diesel" && /bomba de calor|heat pump|octovalve/i.test(haystack)) return false;
  if (fuel === "petrol" && /bater[ií]a hv|soh|heat pump|octovalve/i.test(haystack)) return false;
  return true;
}

export function chunkAppliesToAllBrands(chunk: KnowledgeChunk): boolean {
  return chunk.brands.some((item) => item.trim() === "*");
}

export function chunkMatchesBrand(chunk: KnowledgeChunk, brandRaw: string): boolean {
  if (chunkAppliesToAllBrands(chunk)) return true;
  const brand = normalizeKey(brandRaw);
  if (!brand) return false;
  return chunk.brands.some((item) => {
    const key = normalizeKey(item);
    return key.length > 0 && (brand.includes(key) || key.includes(brand));
  });
}

export function chunkMatchesBrandSpecific(chunk: KnowledgeChunk, brandRaw: string): boolean {
  if (chunkAppliesToAllBrands(chunk)) return false;
  return chunkMatchesBrand(chunk, brandRaw);
}

export function chunkMatchesModel(
  chunk: KnowledgeChunk,
  modelRaw: string,
  versionRaw = "",
): boolean {
  if (!chunk.models || chunk.models.length === 0) return true;
  const model = normalizeKey(modelRaw);
  const version = normalizeKey(versionRaw);
  if (!model && !version) return false;
  return chunk.models.some((item) => {
    const key = normalizeKey(item);
    return model === key || model.includes(key) || key.includes(model) || (Boolean(version) && version.includes(key));
  });
}

export function chunkMatchesVehicle(
  chunk: KnowledgeChunk,
  vehicle: Pick<Vehicle, "brand" | "model" | "year" | "fuel" | "version">,
  options?: { allowUniversal?: boolean },
): boolean {
  const allowUniversal = options?.allowUniversal ?? false;
  if (chunkAppliesToAllBrands(chunk) && !allowUniversal) return false;
  if (!chunkMatchesBrand(chunk, vehicle.brand)) return false;
  if (!chunkMatchesModel(chunk, vehicle.model, vehicle.version ?? "")) return false;
  if (!chunkCompatibleWithFuel(chunk, vehicle.fuel)) return false;
  if (!chunkCompatibleWithDrivetrain(chunk, vehicle.version, vehicle.model)) return false;

  if (chunk.yearFrom && vehicle.year && vehicle.year < chunk.yearFrom) return false;
  if (chunk.yearTo && vehicle.year && vehicle.year > chunk.yearTo) return false;

  return true;
}
