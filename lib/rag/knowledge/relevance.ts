import type { EvidenceLevel, SourceType } from "@/types/evidence";
import type { CanonicalVehicle } from "@/types/identity";
import type { KnowledgeChunk } from "@/types/knowledge";
import { normalizeKey } from "@/lib/utils/math";
import { getChunkScope } from "@/lib/rag/knowledge/scope";
import { normalizeBrandKey } from "@/lib/vehicles/identity/taxonomy";

export interface ChunkRelevance {
  chunk: KnowledgeChunk;
  applicable: boolean;
  /** Solo definido cuando applicable === true. */
  evidenceLevel: EvidenceLevel;
  matchedOn: string[];
  sourceType: SourceType;
  exclusionReason?: string;
}

export function chunkIsUniversal(chunk: KnowledgeChunk): boolean {
  return chunk.brands.some((item) => item.trim() === "*");
}

function tokens(value: string): string[] {
  return normalizeKey(value).split(" ").filter(Boolean);
}

/**
 * Coincidencia de nombre de modelo por tokens completos.
 *
 * La versión anterior usaba `includes` sobre cadenas, de modo que el chunk
 * "s8" casaba con el modelo "S800" y "3" casaba con "Model 3". Aquí solo se
 * acepta igualdad exacta o aparición del nombre completo como subsecuencia de
 * tokens dentro del modelo o la versión.
 */
export function modelNameMatches(chunkModel: string, candidates: string[]): boolean {
  const needle = tokens(chunkModel);
  if (needle.length === 0) return false;

  for (const candidate of candidates) {
    const hay = tokens(candidate);
    if (hay.length === 0) continue;
    if (needle.length === hay.length && needle.every((token, i) => token === hay[i])) return true;
    for (let start = 0; start + needle.length <= hay.length; start += 1) {
      if (needle.every((token, i) => token === hay[start + i])) return true;
    }
  }
  return false;
}

function brandMatches(chunk: KnowledgeChunk, brand: string): boolean {
  const key = normalizeBrandKey(brand);
  if (!key) return false;
  return chunk.brands.some((item) => normalizeBrandKey(item) === key);
}

function engineCodeMatches(chunk: KnowledgeChunk, candidates: string[]): boolean {
  if (!chunk.motorCodes || chunk.motorCodes.length === 0) return false;
  const haystack = candidates.map((item) => normalizeKey(item)).join(" ");
  if (!haystack) return false;
  return chunk.motorCodes.some((code) => {
    const needle = normalizeKey(code);
    return needle.length >= 2 && haystack.split(" ").includes(needle);
  });
}

/**
 * Decide si un fragmento puede afirmarse sobre este vehículo y con qué nivel
 * de evidencia. Las exclusiones son duras: es preferible no decir nada a
 * atribuir a un coche una avería de otro tren motriz.
 */
export function evaluateChunk(chunk: KnowledgeChunk, vehicle: CanonicalVehicle): ChunkRelevance {
  const scope = getChunkScope(chunk);
  const base = { chunk, sourceType: scope.sourceType };

  const exclude = (reason: string): ChunkRelevance => ({
    ...base,
    applicable: false,
    evidenceLevel: "C",
    matchedOn: [],
    exclusionReason: reason,
  });

  // --- Puertas duras -------------------------------------------------------
  const powertrain = vehicle.powertrain.value;
  if (powertrain !== "unknown" && !scope.powertrains.includes(powertrain)) {
    return exclude(`No aplica a un vehículo ${powertrain}.`);
  }

  if (chunk.fuels && chunk.fuels.length > 0 && !chunk.fuels.includes(vehicle.fuelType.value)) {
    return exclude("El combustible del fragmento no coincide.");
  }

  const drive = vehicle.drive.value;
  if (scope.drives && drive !== "unknown" && !scope.drives.includes(drive)) {
    return exclude("Solo aplica a vehículos de tracción total.");
  }

  const bodyClass = vehicle.bodyClass.value;
  if (scope.bodyClasses && bodyClass !== "unknown" && !scope.bodyClasses.includes(bodyClass)) {
    return exclude("Solo aplica a vehículos comerciales ligeros.");
  }

  const year = vehicle.year.value;
  if (chunk.yearFrom && year < chunk.yearFrom) return exclude("Anterior al rango de años del fragmento.");
  if (chunk.yearTo && year > chunk.yearTo) return exclude("Posterior al rango de años del fragmento.");

  // Un fragmento puede listar marcas concretas y además "*". Si la marca del
  // coche está listada explícitamente, cuenta como conocimiento de marca; solo
  // se degrada a segmento cuando el único vínculo es el comodín.
  const universal = chunkIsUniversal(chunk);
  const brandListed = brandMatches(chunk, vehicle.make.value);
  if (!brandListed && !universal) return exclude("La marca no coincide.");

  const modelCandidates = [vehicle.model.value, vehicle.trim?.value ?? ""].filter(Boolean);
  const hasModelList = Boolean(chunk.models && chunk.models.length > 0);
  const modelOk = hasModelList
    ? chunk.models!.some((item) => modelNameMatches(item, modelCandidates))
    : true;
  if (hasModelList && !modelOk && !universal) {
    return exclude("El modelo no está en la lista del fragmento.");
  }

  // --- Nivel de evidencia --------------------------------------------------
  const engineCandidates = [
    vehicle.engineCode?.value ?? "",
    vehicle.trim?.value ?? "",
  ].filter(Boolean);
  const engineOk = engineCodeMatches(chunk, engineCandidates);

  const matchedOn: string[] = [];
  if (brandListed) matchedOn.push("marca");
  if (hasModelList && modelOk) matchedOn.push("modelo");
  if (engineOk) matchedOn.push("motor");
  if (chunk.fuels?.includes(vehicle.fuelType.value)) matchedOn.push("combustible");
  if (chunk.yearFrom || chunk.yearTo) matchedOn.push("año");

  let evidenceLevel: EvidenceLevel;
  if (!brandListed) {
    evidenceLevel = "C";
  } else if ((hasModelList && modelOk) || engineOk) {
    evidenceLevel = "A";
  } else {
    evidenceLevel = "B";
  }

  return { ...base, applicable: true, evidenceLevel, matchedOn };
}

export function evaluateChunks(
  chunks: KnowledgeChunk[],
  vehicle: CanonicalVehicle,
): ChunkRelevance[] {
  return chunks.map((chunk) => evaluateChunk(chunk, vehicle));
}

const LEVEL_ORDER: Record<EvidenceLevel, number> = { A: 0, B: 1, C: 2, D: 3 };

export function compareEvidenceLevel(a: EvidenceLevel, b: EvidenceLevel): number {
  return LEVEL_ORDER[a] - LEVEL_ORDER[b];
}
