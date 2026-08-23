import type { BodyClass, Drivetrain, PowertrainClass } from "@/types/identity";
import type { KnowledgeChunk } from "@/types/knowledge";
import type { SourceType } from "@/types/evidence";
import { normalizeKey } from "@/lib/utils/math";
import { powertrainFromFuel } from "@/lib/vehicles/identity/taxonomy";

/**
 * Ámbito de aplicación de un fragmento de conocimiento.
 *
 * El corpus tiene ~350 fragmentos transversales (`brands: ["*"]`) pensados como
 * playbooks de síntomas. Sin acotar su ámbito, cualquier vehículo recibía
 * conocimiento de motores que no tiene: por eso un eléctrico terminaba con
 * "sensor CKP", "P0118 ECT" o "volante bimasa".
 *
 * El ámbito se deduce del texto del fragmento y se cachea por id.
 */
export interface ChunkScope {
  powertrains: PowertrainClass[];
  /** null = aplica a cualquier tracción. */
  drives: Drivetrain[] | null;
  /** null = aplica a cualquier carrocería. */
  bodyClasses: BodyClass[] | null;
  sourceType: SourceType;
}

const ALL_POWERTRAINS: PowertrainClass[] = ["ice", "hybrid", "phev", "bev"];
const COMBUSTION: PowertrainClass[] = ["ice", "hybrid", "phev"];
const HIGH_VOLTAGE: PowertrainClass[] = ["bev", "hybrid", "phev"];
const PLUGGABLE: PowertrainClass[] = ["bev", "phev"];

/** Componentes que solo existen si hay motor térmico. */
const COMBUSTION_MARKERS = [
  "egr",
  "fap",
  "dpf",
  "gpf",
  "adblue",
  "scr",
  "turbo",
  "turbocompresor",
  "inyector",
  "inyeccion",
  "bujia",
  "bujias",
  "precalentamiento",
  "calentadores",
  "cadena de distribucion",
  "correa de distribucion",
  "distribucion",
  "wet belt",
  "correa humeda",
  "culata",
  "junta de culata",
  "catalizador",
  "sonda lambda",
  "lambda",
  "ciguenal",
  "arbol de levas",
  "levas",
  "termostato",
  "ect",
  "maf",
  "caudalimetro",
  "colector de admision",
  "colector de escape",
  "escape",
  "admision",
  "embrague",
  "volante bimasa",
  "bimasa",
  "dmf",
  "common rail",
  "bomba de alta presion",
  "compresion",
  "segmentos",
  "pcv",
  "blowby",
  "carbonilla",
  "carbonizada",
  "valvulas de admision",
  "aceite de motor",
  "consumo de aceite",
  "cambio de aceite",
  "filtro de aceite",
  "filtro de combustible",
  "deposito de combustible",
  "regeneracion",
  "ralenti",
  "gasolina",
  "diesel",
  "gasoil",
  "tdi",
  "tsi",
  "hdi",
  "dci",
  "crdi",
  "gdi",
  "multijet",
  "ecoboost",
  "cilindro",
  "cilindrada",
  "p0401",
  "p0402",
  "p0118",
  "ckp",
  "cmp",
  "vvt",
  "cvvt",
];

/** Componentes de tracción eléctrica de alto voltaje. */
const HIGH_VOLTAGE_MARKERS = [
  "bateria hv",
  "bateria de alto voltaje",
  "alto voltaje",
  "alta tension",
  "soh",
  "state of health",
  "salud de la bateria",
  "inversor",
  "motor electrico",
  "regenerativ",
  "celdas",
  "modulos de bateria",
  "bms",
  "kwh",
  "degradacion de bateria",
  "traccion electrica",
];

/** Solo tiene sentido si el coche se enchufa a la red. */
const PLUGGABLE_MARKERS = [
  "carga rapida",
  "carga dc",
  "ccs",
  "chademo",
  "cargador",
  "obc",
  "enchuf",
  "wallbox",
  "preacondicion",
  "precondicion",
  "bomba de calor",
  "heat pump",
  "octovalve",
  "autonomia",
  "punto de carga",
  "dc-dc",
  "iccu",
  "curva de carga",
  "hv heater",
  "calentador de bateria",
];

const AWD_MARKERS = [
  "xdrive",
  "quattro",
  "4motion",
  "4matic",
  "haldex",
  "allgrip",
  "all4",
  "traccion total",
  "caja de transferencia",
  "diferencial trasero",
  "acoplamiento",
  "awd",
  "4x4",
  "4wd",
  "reductora",
];

const LCV_MARKERS = [
  "furgoneta",
  "furgon",
  "comercial ligero",
  "lcv",
  "reparto",
  "ex flota",
  "carga util",
  "sobrecarga",
  "transit",
  "sprinter",
  "ducato",
  "crafter",
  "boxer",
  "jumper",
  "master",
  "trafic",
  "vivaro",
  "daily",
];

function containsAny(haystack: string, markers: string[]): boolean {
  return markers.some((marker) => haystack.includes(marker));
}

function chunkText(chunk: KnowledgeChunk): string {
  return normalizeKey(
    [
      chunk.title,
      chunk.content,
      chunk.appliesWhen,
      chunk.tags?.join(" "),
      chunk.symptoms?.join(" "),
      chunk.askSeller?.join(" "),
      chunk.inspectSteps?.join(" "),
      chunk.maintenanceInterval,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function inferSourceType(chunk: KnowledgeChunk): SourceType {
  const source = normalizeKey(`${chunk.source} ${chunk.sourceUrl ?? ""}`);
  if (chunk.type === "recall") return "government";
  if (containsAny(source, ["nhtsa", "dgt", "itv", "rappex", "ministerio", "kba", "euro ncap"])) {
    return "government";
  }
  if (containsAny(source, ["tsb", "manual de taller", "manual oficial", "fabricante", "boletin tecnico"])) {
    return "manufacturer";
  }
  if (containsAny(source, ["foro", "forum", "comunidad", "propietarios", "reddit", "faq"])) {
    return "community";
  }
  return "technical";
}

/**
 * Deduce a qué trenes motrices puede aplicar el fragmento.
 * Un fragmento con `fuels` explícito manda; si no, se mira el texto.
 */
function inferPowertrains(chunk: KnowledgeChunk, text: string): PowertrainClass[] {
  if (chunk.fuels && chunk.fuels.length > 0) {
    const declared = Array.from(new Set(chunk.fuels.map(powertrainFromFuel))).filter(
      (item): item is PowertrainClass => item !== "unknown",
    );
    if (declared.length > 0) return declared;
  }

  const hasCombustion = containsAny(text, COMBUSTION_MARKERS);
  const hasPluggable = containsAny(text, PLUGGABLE_MARKERS);
  const hasHighVoltage = hasPluggable || containsAny(text, HIGH_VOLTAGE_MARKERS);

  if (hasCombustion && hasHighVoltage) {
    // Híbridos: conviven ambos mundos. No aplica a un eléctrico puro.
    return hasPluggable ? ["hybrid", "phev"] : COMBUSTION;
  }
  if (hasCombustion) return COMBUSTION;
  if (hasPluggable) return PLUGGABLE;
  if (hasHighVoltage) return HIGH_VOLTAGE;
  // Chapa, suspensión, neumáticos, documentación: aplica a todo.
  return ALL_POWERTRAINS;
}

function inferDrives(text: string): Drivetrain[] | null {
  return containsAny(text, AWD_MARKERS) ? ["awd"] : null;
}

function inferBodyClasses(text: string): BodyClass[] | null {
  return containsAny(text, LCV_MARKERS) ? ["lcv"] : null;
}

const cache = new Map<string, ChunkScope>();

export function getChunkScope(chunk: KnowledgeChunk): ChunkScope {
  const cached = cache.get(chunk.id);
  if (cached) return cached;

  const text = chunkText(chunk);
  const scope: ChunkScope = {
    powertrains: inferPowertrains(chunk, text),
    drives: inferDrives(text),
    bodyClasses: inferBodyClasses(text),
    sourceType: inferSourceType(chunk),
  };
  cache.set(chunk.id, scope);
  return scope;
}

export function resetChunkScopeCache(): void {
  cache.clear();
}
