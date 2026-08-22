/**
 * Expande consultas en español con sinónimos y jerga de foros técnicos
 * para mejorar el recall del índice TF-IDF (sin embeddings).
 */

const SYNONYM_GROUPS: string[][] = [
  ["fap", "dpf", "filtro particulas", "filtro de particulas", "antiparticulas", "regeneracion"],
  ["egr", "valvula egr", "recirculacion", "gases escape"],
  ["adblue", "scr", "urea", "catalizador scr", "nox"],
  ["distribucion", "cadena", "correa", "kit distribucion", "tensor", "guia cadena", "cambelt"],
  ["turbo", "turbocompresor", "geometria variable", "wastegate", "actuator"],
  ["inyector", "inyectores", "common rail", "rail", "bomba alta presion"],
  ["volante bimasa", "bimasa", "dmf", "dual mass", "embrague"],
  ["dsg", "dq200", "dq250", "dq381", "s tronic", "doble embrague", "dct", "powershift"],
  ["cvt", "variador", "caja cvt"],
  ["caja automatica", "cambio automatico", "zf", "8hp", "eat6", "eat8", "tiptronic"],
  ["aceite", "consumo aceite", "humo azul", "nivel aceite", "dilucion"],
  ["refrigerante", "anticongelante", "fuga refrigerante", "sobrecalentamiento", "culata"],
  ["bomba agua", "water pump", "termostato"],
  ["bateria hibrida", "hvb", "traction battery", "soh", "degradacion bateria"],
  ["inverter", "inversor", "mg1", "mg2", "sistema hibrido"],
  ["abs", "esp", "sensor rueda", "asistente frenada"],
  ["aire acondicionado", "climatizador", "compresor ac", "gas refrigerante"],
  ["suspension", "amortiguadores", "bieletas", "silentblocks", "ruidos suspension"],
  ["direccion", "cremallera", "bomba direccion", "asistencia electrica"],
  ["catalizador", "lambda", "sonda oxigeno", "emisiones"],
  ["vanos", "vvt", "variador arbol levas", "desfase levas"],
  ["puretech", "correa bano aceite", "wet belt"],
  ["fiabilidad", "averia", "fallo", "problema", "averias", "fallos", "problemas"],
  ["mantenimiento", "revision", "servicio", "intervalo"],
  ["inspeccion", "precompra", "revisar", "checklist", "taller"],
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
