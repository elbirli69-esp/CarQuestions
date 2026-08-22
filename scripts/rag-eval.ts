/**
 * Evalúa recall del RAG con preguntas típicas de compradores.
 * Uso: npx tsx scripts/rag-eval.ts
 */
import { resetKnowledgeCache, loadKnowledgeChunks } from "../lib/rag/knowledge/load";
import { getKnowledgeVectorStore } from "../lib/rag/vector/store";

interface Case {
  name: string;
  text: string;
  vehicle: { brand: string; model: string; year: number; fuel: string };
  expectIdIncludes: string[];
}

const CASES: Case[] = [
  {
    name: "BMW cadena frío",
    text: "ruido metalico al arrancar en frio cadena",
    vehicle: { brand: "BMW", model: "320d", year: 2017, fuel: "diesel" },
    expectIdIncludes: ["timing", "chain", "n47", "cold-rattle"],
  },
  {
    name: "PureTech wet belt",
    text: "correa en bano de aceite puretech bombe aceite",
    vehicle: { brand: "Peugeot", model: "308", year: 2018, fuel: "petrol" },
    expectIdIncludes: ["puretech", "wet-belt", "wet_belt", "belt"],
  },
  {
    name: "DSG DQ200",
    text: "tirones dsg mechatronic doble embrague",
    vehicle: { brand: "Volkswagen", model: "Golf", year: 2015, fuel: "petrol" },
    expectIdIncludes: ["dsg", "dq200", "mechatronic"],
  },
  {
    name: "FAP ciudad",
    text: "aviso fap regeneracion ciudad perdida potencia",
    vehicle: { brand: "Seat", model: "Leon", year: 2016, fuel: "diesel" },
    expectIdIncludes: ["dpf", "fap", "egr"],
  },
  {
    name: "Toyota hibrido bateria",
    text: "bateria hibrida soh autonomia inverter",
    vehicle: { brand: "Toyota", model: "Prius", year: 2012, fuel: "hybrid" },
    expectIdIncludes: ["hybrid", "battery", "hvb", "soh", "inverter", "toyota"],
  },
  {
    name: "EcoBoost refrigerante",
    text: "pierde refrigerante sin fuga ecoboost",
    vehicle: { brand: "Ford", model: "Focus", year: 2015, fuel: "petrol" },
    expectIdIncludes: ["ecoboost", "coolant", "refrigerante"],
  },
  {
    name: "AdBlue SCR",
    text: "aviso adblue calidad scr no arranca",
    vehicle: { brand: "Mercedes-Benz", model: "C220", year: 2018, fuel: "diesel" },
    expectIdIncludes: ["adblue", "scr", "nox", "urea"],
  },
  {
    name: "CVT Nissan",
    text: "patina cvt sobrecalentamiento jatco",
    vehicle: { brand: "Nissan", model: "Qashqai", year: 2017, fuel: "petrol" },
    expectIdIncludes: ["cvt", "qashqai", "jatco"],
  },
  {
    name: "PHEV carga",
    text: "plugin hybrid no carga autonomia EV soh",
    vehicle: { brand: "Jeep", model: "Compass", year: 2022, fuel: "plugin_hybrid" },
    expectIdIncludes: ["phev", "4xe", "hybrid", "soh", "carga"],
  },
  {
    name: "12V electronica",
    text: "avisos abs esp aleatorios bateria 12v",
    vehicle: { brand: "Volkswagen", model: "Golf", year: 2019, fuel: "petrol" },
    expectIdIncludes: ["12v", "bateria", "agm", "electronica"],
  },
  {
    name: "1.3 TCe cadena",
    text: "ruido cadena frio 1.3 tce hr13",
    vehicle: { brand: "Renault", model: "Captur", year: 2020, fuel: "petrol" },
    expectIdIncludes: ["tce", "hr13", "cadena", "1-3", "1.3"],
  },
  {
    name: "ADAS calibracion",
    text: "lane assist loco calibracion camara parabrisas",
    vehicle: { brand: "Audi", model: "A4", year: 2019, fuel: "diesel" },
    expectIdIncludes: ["adas", "calibracion", "camara"],
  },
  {
    name: "MEB software carga",
    text: "id.3 carga dc debil software bateria meb",
    vehicle: { brand: "Volkswagen", model: "ID.3", year: 2022, fuel: "electric" },
    expectIdIncludes: ["meb", "id3", "id.3", "software", "ev"],
  },
  {
    name: "E-GMP ICCU",
    text: "ioniq 5 no carga ac iccu campana",
    vehicle: { brand: "Hyundai", model: "Ioniq 5", year: 2023, fuel: "electric" },
    expectIdIncludes: ["egmp", "iccu", "ioniq", "carga"],
  },
  {
    name: "Frenos vibracion",
    text: "vibracion al frenar discos alabeados",
    vehicle: { brand: "BMW", model: "320d", year: 2016, fuel: "diesel" },
    expectIdIncludes: ["frenos", "discos", "pulsation", "brake"],
  },
  {
    name: "Audi DL501",
    text: "tirones s tronic mechatronic dl501",
    vehicle: { brand: "Audi", model: "A5", year: 2013, fuel: "petrol" },
    expectIdIncludes: ["dl501", "stronic", "mechatronic", "s-tronic"],
  },
  {
    name: "Subaru culata",
    text: "junta culata refrigerante mayonesa boxer",
    vehicle: { brand: "Subaru", model: "Forester", year: 2010, fuel: "petrol" },
    expectIdIncludes: ["subaru", "culata", "gasket", "boxer", "head"],
  },
  {
    name: "LCV FAP reparto",
    text: "furgoneta reparto urbano fap regeneracion",
    vehicle: { brand: "Ford", model: "Transit", year: 2018, fuel: "diesel" },
    expectIdIncludes: ["lcv", "fap", "dpf", "transit", "reparto"],
  },
  {
    name: "Porsche IMS",
    text: "ims rodamiento boxster 911 precompra",
    vehicle: { brand: "Porsche", model: "Boxster", year: 2005, fuel: "petrol" },
    expectIdIncludes: ["ims", "porsche", "m96"],
  },
  {
    name: "Airmatic altura",
    text: "airmatic esquina baja compresor suspension neumatica",
    vehicle: { brand: "Mercedes-Benz", model: "E-Class", year: 2014, fuel: "diesel" },
    expectIdIncludes: ["airmatic", "air", "fuelle", "suspension"],
  },
  {
    name: "PureTech 2023",
    text: "puretech 2023 inspeccion correa bano aceite",
    vehicle: { brand: "Peugeot", model: "208", year: 2023, fuel: "petrol" },
    expectIdIncludes: ["puretech", "wet", "correa", "belt"],
  },
  {
    name: "BYD Blade",
    text: "byd atto 3 bateria blade garantia carga",
    vehicle: { brand: "BYD", model: "Atto 3", year: 2024, fuel: "electric" },
    expectIdIncludes: ["byd", "atto", "blade", "ev"],
  },
  {
    name: "MG4 suspension",
    text: "mg4 ruido suspension software ota",
    vehicle: { brand: "MG", model: "MG4", year: 2023, fuel: "electric" },
    expectIdIncludes: ["mg4", "mg", "suspension", "ev"],
  },
  {
    name: "MAF sucio",
    text: "sensor maf sucio tirones consumo mezcla",
    vehicle: { brand: "Volkswagen", model: "Golf", year: 2015, fuel: "petrol" },
    expectIdIncludes: ["maf", "sensor", "mezcla"],
  },
  {
    name: "Invierno 12V",
    text: "invierno bateria 12v no arranca frio",
    vehicle: { brand: "Seat", model: "Leon", year: 2017, fuel: "petrol" },
    expectIdIncludes: ["invierno", "12v", "arranque", "bateria"],
  },
  {
    name: "Import UK RHD",
    text: "importacion uk volante derecha homologacion faros",
    vehicle: { brand: "BMW", model: "320d", year: 2015, fuel: "diesel" },
    expectIdIncludes: ["import", "uk", "rhd", "homologacion"],
  },
  {
    name: "Alpine A110",
    text: "alpine a110 mantenimiento dct track",
    vehicle: { brand: "Alpine", model: "A110", year: 2020, fuel: "petrol" },
    expectIdIncludes: ["alpine", "a110", "dct"],
  },
  {
    name: "Theta recall VIN",
    text: "theta ii recall campana motor vin hyundai",
    vehicle: { brand: "Hyundai", model: "Tucson", year: 2016, fuel: "petrol" },
    expectIdIncludes: ["theta", "recall", "vin"],
  },
  {
    name: "DS PureTech",
    text: "ds3 puretech correa aceite wet belt",
    vehicle: { brand: "DS", model: "DS3", year: 2019, fuel: "petrol" },
    expectIdIncludes: ["ds3", "puretech", "wet", "correa", "ds"],
  },
  {
    name: "TPMS sensor",
    text: "testigo tpms sensor presion neumaticos",
    vehicle: { brand: "Volkswagen", model: "Golf", year: 2018, fuel: "petrol" },
    expectIdIncludes: ["tpms", "presion", "sensor"],
  },
  {
    name: "Catalizador P0420",
    text: "codigo p0420 catalizador ineficiente olor",
    vehicle: { brand: "Toyota", model: "Corolla", year: 2014, fuel: "petrol" },
    expectIdIncludes: ["catalizador", "p0420", "cat", "emisiones"],
  },
  {
    name: "Airbag light",
    text: "testigo airbag encendido pretensor",
    vehicle: { brand: "Ford", model: "Focus", year: 2016, fuel: "petrol" },
    expectIdIncludes: ["airbag", "srs", "pretensor", "seguridad"],
  },
  {
    name: "Heater core",
    text: "olor dulce alfombra copiloto heater core calefaccion",
    vehicle: { brand: "BMW", model: "320d", year: 2015, fuel: "diesel" },
    expectIdIncludes: ["heater", "calor", "refrigerante", "hvac"],
  },
  {
    name: "Blend door",
    text: "click salpicadero actuador trampilla clima solo frio",
    vehicle: { brand: "Volkswagen", model: "Golf", year: 2014, fuel: "petrol" },
    expectIdIncludes: ["blend", "trampilla", "hvac", "actuador", "click"],
  },
  {
    name: "Volvo T8",
    text: "volvo t8 phev autonomia carga xc60",
    vehicle: { brand: "Volvo", model: "XC60", year: 2020, fuel: "plugin_hybrid" },
    expectIdIncludes: ["volvo", "t8", "phev"],
  },
];

function matchesExpectation(id: string, expectIdIncludes: string[]): boolean {
  const hay = id.toLowerCase();
  return expectIdIncludes.some((token) => hay.includes(token.toLowerCase()));
}

function main() {
  resetKnowledgeCache();
  const chunks = loadKnowledgeChunks();
  const store = getKnowledgeVectorStore();

  let passed = 0;
  const rows: Array<{ name: string; ok: boolean; top: string }> = [];

  for (const testCase of CASES) {
    const hits = store.query({
      text: testCase.text,
      vehicle: testCase.vehicle as never,
      limit: 8,
    });
    const ids = hits.map((hit) => hit.document.id.replace(/^knowledge_/, ""));
    const ok = ids.some((id) => matchesExpectation(id, testCase.expectIdIncludes));
    if (ok) passed += 1;
    rows.push({ name: testCase.name, ok, top: ids.slice(0, 3).join(", ") });
  }

  console.log(`Corpus: ${chunks.length} chunks`);
  console.log(`RAG eval: ${passed}/${CASES.length} cases hit expected topics in top-8`);
  for (const row of rows) {
    console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.name}  →  ${row.top}`);
  }

  if (passed < Math.ceil(CASES.length * 0.75)) {
    process.exitCode = 1;
  }
}

main();
