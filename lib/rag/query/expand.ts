/**
 * Expande consultas en español con sinónimos y jerga de foros técnicos
 * para mejorar el recall del índice TF-IDF (sin embeddings).
 */

const SYNONYM_GROUPS: string[][] = [
  ["fap", "dpf", "filtro particulas", "filtro de particulas", "antiparticulas", "regeneracion"],
  ["egr", "valvula egr", "recirculacion", "gases escape"],
  ["adblue", "scr", "urea", "catalizador scr", "nox"],
  ["distribucion", "cadena", "correa", "kit distribucion", "tensor", "guia cadena", "cambelt", "wet belt"],
  ["turbo", "turbocompresor", "geometria variable", "wastegate", "actuator", "variable geometry"],
  ["inyector", "inyectores", "common rail", "rail", "bomba alta presion", "hpfp"],
  ["volante bimasa", "bimasa", "dmf", "dual mass", "embrague"],
  ["dsg", "dq200", "dq250", "dq381", "s tronic", "doble embrague", "dct", "powershift", "edc", "mechatronic"],
  ["cvt", "variador", "caja cvt", "jatco"],
  ["caja automatica", "cambio automatico", "zf", "8hp", "9hp", "eat6", "eat8", "tiptronic", "aisin"],
  ["aceite", "consumo aceite", "humo azul", "nivel aceite", "dilucion", "long life"],
  ["refrigerante", "anticongelante", "fuga refrigerante", "sobrecalentamiento", "culata", "termostato"],
  ["bomba agua", "water pump", "termostato"],
  ["bateria hibrida", "hvb", "traction battery", "soh", "degradacion bateria", "inverter"],
  ["inverter", "inversor", "mg1", "mg2", "sistema hibrido", "transaxle"],
  ["abs", "esp", "sensor rueda", "asistente frenada"],
  ["aire acondicionado", "climatizador", "compresor ac", "gas refrigerante"],
  ["suspension", "amortiguadores", "bieletas", "silentblocks", "ruidos suspension", "fuelle"],
  ["direccion", "cremallera", "bomba direccion", "asistencia electrica"],
  ["catalizador", "lambda", "sonda oxigeno", "emisiones", "gpf"],
  ["vanos", "vvt", "variador arbol levas", "desfase levas", "multiair"],
  ["puretech", "correa bano aceite", "wet belt", "ecoboost", "thp", "prince"],
  ["haldex", "4motion", "quattro", "xdrive", "allgrip", "awd", "4x4"],
  ["ruido", "traqueteo", "cascabeleo", "silbido", "vibracion", "tirones"],
  ["meb", "id3", "id4", "enyaq", "born", "q4", "plataforma meb"],
  ["egmp", "ioniq", "ev6", "iccu", "800v"],
  ["byd", "blade", "atto", "seal", "dm-i", "nev"],
  ["maf", "map", "lambda", "o2", "knock", "ect", "ckp", "cmp", "sensor"],
  ["invierno", "verano", "otono", "primavera", "viaje", "vacaciones"],
  ["import", "uk", "rhd", "jdm", "homologacion", "grey"],
  ["airbag", "srs", "tpms", "cinturon", "isofix", "seguridad"],
  ["catalizador", "p0420", "evap", "emisiones", "opacidad", "gpf"],
  ["hvac", "heater", "calefaccion", "climatizador", "habitaculo", "blend"],
  ["remolque", "caravana", "enganche", "tow", "portabicis", "cofre"],
  ["frenos", "discos", "pastillas", "epb", "pulsacion", "alabeado"],
  ["direccion", "cremallera", "eps", "bieletas", "asistencia"],
  ["mhev", "48v", "mild hybrid", "isg", "bsg", "start-stop", "agm", "efb"],
  ["gdi", "inyeccion directa", "dilucion", "hpfp", "carbonilla", "walnut"],
  ["bimasa", "dmf", "volante bimasa", "embrague", "receptor"],
  ["precalentamiento", "glow", "bujias glow", "arranque frio diesel"],
  ["parasitario", "fuga corriente", "consumo reposo", "descarga bateria"],
  ["ingenium", "land rover", "jaguar", "pdk", "porsche"],
  ["lcv", "furgoneta", "furgon", "sprinter", "transit", "ducato", "iveco", "crafter", "trafic", "flota"],
  ["heat pump", "bomba de calor", "preconditioning", "preacondicion", "ptc", "termica", "derating"],
  ["adblue", "scr", "urea", "nox", "cristalizacion"],
  ["youngtimer", "clasico", "clasicos", "oxido", "estribos", "w124", "e30", "mx5"],
  ["regen", "regenerativo", "one pedal", "brake-by-wire", "epb", "blending"],
  ["nvh", "aullido", "chirrido", "golpeteo", "clunk", "traqueteo", "silbido", "temblor"],
  ["haldex", "4motion", "quattro", "xdrive", "4matic", "allgrip", "awd", "4x4", "ptu"],
  ["fiabilidad", "averia", "fallo", "problema", "averias", "fallos", "problemas", "sintoma"],
  ["mantenimiento", "revision", "servicio", "intervalo"],
  ["inspeccion", "precompra", "revisar", "checklist", "taller", "obd"],
  ["solucion", "reparacion", "kit", "sustitucion", "limpieza", "campana", "recall"],
];

export function expandAutomotiveQuery(text: string): string {
  const lower = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const extras: string[] = [];
  for (const group of SYNONYM_GROUPS) {
    if (group.some((term) => lower.includes(term))) {
      extras.push(...group);
    }
  }

  if (extras.length === 0) return text;
  return `${text} ${[...new Set(extras)].join(" ")}`;
}

export type QuestionIntent =
  | "price"
  | "reliability"
  | "maintenance"
  | "inspection"
  | "consumption"
  | "comparison"
  | "general";

export function classifyQuestionIntent(question: string): QuestionIntent {
  const q = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/precio|barato|caro|pagar|tasacion|valoraci[oó]n|oferta/.test(q)) return "price";
  if (/consum|litros|autonomia|kwh|eficiencia/.test(q)) return "consumption";
  if (/compar|alternativ|equivalente|cual comprar|mejor comprar|otro modelo/.test(q)) {
    return "comparison";
  }
  if (/manten|distribuci|itv|aceite|revision|intervalo|adblue/.test(q)) return "maintenance";
  if (/revis|inspecc|precompra|que mirar|checklist|taller/.test(q)) return "inspection";
  if (/fiab|aver|problem|fallo|sintoma|ruido|cadena|fap|egr|turbo|caja|dsg|bimasa/.test(q)) {
    return "reliability";
  }
  return "general";
}

export function intentRetrievalBoost(intent: QuestionIntent): string {
  switch (intent) {
    case "reliability":
      return "averias sintomas causas soluciones fiabilidad problemas conocidos foros tecnicos";
    case "maintenance":
      return "mantenimiento intervalos aceite filtros distribucion coste revision";
    case "inspection":
      return "inspeccion precompra checklist revisar diagnostico taller sintomas";
    case "consumption":
      return "consumo real homologado urbano carretera hibrido electrico";
    case "comparison":
      return "alternativas equivalentes ranking compra comparativa";
    case "price":
      return "precio mercado valoracion comparables oferta";
    default:
      return "fiabilidad mantenimiento averias soluciones inspeccion";
  }
}
