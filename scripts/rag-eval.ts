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
