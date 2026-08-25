/**
 * Shared RAG eval cases for scripts/rag-eval.ts and CI tests.
 */
export interface RagEvalCase {
  name: string;
  text: string;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    fuel: string;
    engineCode?: string;
    gearboxCode?: string;
    componentCodes?: string[];
  };
  expectIdIncludes?: string[];
  /** If set, top hits must NOT contain any of these tokens in chunk id. */
  expectIdExcludes?: string[];
}

export const RAG_POSITIVE_CASES: RagEvalCase[] = [
  {
    name: "BMW cadena frío",
    text: "ruido metalico al arrancar en frio cadena",
    vehicle: { brand: "BMW", model: "320d", year: 2017, fuel: "diesel" },
    expectIdIncludes: ["timing", "chain", "n47", "cold-rattle"],
  },
  {
    name: "DSG DQ200",
    text: "tirones dsg mechatronic doble embrague",
    vehicle: { brand: "Volkswagen", model: "Golf", year: 2015, fuel: "petrol" },
    expectIdIncludes: ["dsg", "dq200", "mechatronic"],
  },
  {
    name: "PureTech wet belt",
    text: "correa en bano de aceite puretech",
    vehicle: { brand: "Peugeot", model: "308", year: 2018, fuel: "petrol" },
    expectIdIncludes: ["puretech", "wet-belt", "wet_belt", "belt"],
  },
];

export const RAG_ADVERSARIAL_CASES: RagEvalCase[] = [
  {
    name: "BMW X1 no PureTech Peugeot",
    text: "fiabilidad averias problemas conocidos",
    vehicle: { brand: "BMW", model: "X1", year: 2021, fuel: "diesel", engineCode: "B47" },
    expectIdIncludes: ["bmw", "n47", "b47", "x1", "diesel"],
    expectIdExcludes: ["puretech", "308-puretech"],
  },
  {
    name: "BMW X1 no DQ200 when B47 resolved",
    text: "caja automatica dsg tirones",
    vehicle: {
      brand: "BMW",
      model: "X1",
      year: 2021,
      fuel: "diesel",
      engineCode: "B47",
      componentCodes: ["B47"],
    },
    expectIdExcludes: ["dq200"],
  },
  {
    name: "Seat Leon DQ200 with gearbox code",
    text: "fiabilidad caja cambios",
    vehicle: {
      brand: "Seat",
      model: "Leon",
      year: 2016,
      fuel: "petrol",
      gearboxCode: "DQ200",
      componentCodes: ["DQ200"],
    },
    expectIdIncludes: ["dq200", "dsg"],
  },
  {
    name: "Ebro EV no BMW diesel",
    text: "problemas bateria motor",
    vehicle: { brand: "Ebro", model: "S800", year: 2025, fuel: "electric" },
    expectIdIncludes: ["electric", "ev", "bater", "ebro"],
    expectIdExcludes: ["n47-timing", "bmw-diesel"],
  },
];

export function matchesRagExpectation(id: string, tokens: string[]): boolean {
  const hay = id.toLowerCase();
  return tokens.some((token) => hay.includes(token.toLowerCase()));
}

export function matchesRagExclusion(id: string, tokens: string[]): boolean {
  const hay = id.toLowerCase();
  return tokens.some((token) => hay.includes(token.toLowerCase()));
}
