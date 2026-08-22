/**
 * Benchmark de scraping coches.net — comparables y extract.
 * Uso:
 *   npm run scraping:benchmark -- --save benchmarks/scraping-baseline.json
 *   npm run scraping:benchmark -- --compare benchmarks/a.json benchmarks/b.json
 */

import fs from "node:fs";
import path from "node:path";
import { cochesNetProvider } from "@/lib/sources/coches-net/provider";

const CASES = [
  { id: "A", brand: "BMW", model: "X1", year: 2019, mileage: 75000, fuel: "diesel" as const },
  { id: "B", brand: "Volkswagen", model: "Golf", year: 2018, mileage: 90000, fuel: "petrol" as const },
  { id: "C", brand: "SEAT", model: "León", year: 2020, mileage: 60000, fuel: "petrol" as const },
  { id: "D", brand: "Toyota", model: "Corolla", year: 2021, mileage: 45000, fuel: "hybrid" as const },
  {
    id: "E",
    brand: "Mercedes-Benz",
    model: "Clase A",
    year: 2017,
    mileage: 110000,
    fuel: "diesel" as const,
  },
];

interface CaseResult {
  id: string;
  listings: number;
  coreCount?: number;
  mappedCount?: number;
  matchStrictness?: string;
  avgSimilarity: number;
  adsRawNote?: string;
  extractFilled?: string[];
}

async function runBenchmark(): Promise<{ at: string; cases: CaseResult[] }> {
  const cases: CaseResult[] = [];

  for (const c of CASES) {
    const result = await cochesNetProvider.searchComparables({
      brand: c.brand,
      model: c.model,
      year: c.year,
      mileage: c.mileage,
      fuel: c.fuel,
      limit: 30,
    });

    const listings = result.listings;
    const avgSimilarity =
      listings.length > 0
        ? listings.reduce((s, l) => s + (l.similarity ?? 0), 0) / listings.length
        : 0;

    const strictness = listings[0]?.rawData?.matchStrictness as string | undefined;
    const rawNote = result.notes.find((n) => n.includes("brutos")) ?? result.notes[0];

    cases.push({
      id: c.id,
      listings: listings.length,
      matchStrictness: strictness,
      avgSimilarity: Math.round(avgSimilarity * 1000) / 1000,
      adsRawNote: rawNote,
    });

    console.log(
      `${c.id}: listings=${listings.length} strict=${strictness ?? "n/a"} avgSim=${avgSimilarity.toFixed(2)}`,
    );
  }

  const urlsPath = path.join(process.cwd(), "lib/sources/coches-net/__fixtures__/urls.json");
  if (fs.existsSync(urlsPath)) {
    const urls = JSON.parse(fs.readFileSync(urlsPath, "utf8")) as string[];
    for (let i = 0; i < urls.length; i += 1) {
      try {
        const extract = await cochesNetProvider.extractListing(urls[i]!);
        const filled = [
          extract.vehicle?.advertisedPrice != null && "precio",
          extract.vehicle?.mileage != null && "km",
          extract.vehicle?.power != null && "CV",
        ].filter(Boolean) as string[];
        cases.push({
          id: `extract-${i + 1}`,
          listings: 0,
          avgSimilarity: 0,
          extractFilled: filled,
        });
        console.log(`extract-${i + 1}: ${filled.join(", ") || "parcial"}`);
      } catch (e) {
        console.log(`extract-${i + 1}: error`, e instanceof Error ? e.message : e);
        cases.push({
          id: `extract-${i + 1}`,
          listings: 0,
          avgSimilarity: 0,
          extractFilled: [],
        });
      }
    }
  }

  return { at: new Date().toISOString(), cases };
}

function compareFiles(aPath: string, bPath: string): void {
  const a = JSON.parse(fs.readFileSync(aPath, "utf8")) as { cases: CaseResult[] };
  const b = JSON.parse(fs.readFileSync(bPath, "utf8")) as { cases: CaseResult[] };
  console.log("\n--- Comparación ---");
  for (const ca of a.cases) {
    const cb = b.cases.find((x) => x.id === ca.id);
    if (!cb) continue;
    if (ca.listings > 0 && cb.listings > 0) {
      const delta = cb.listings - ca.listings;
      const simDelta = cb.avgSimilarity - ca.avgSimilarity;
      console.log(
        `${ca.id}: listings ${ca.listings} → ${cb.listings} (${delta >= 0 ? "+" : ""}${delta}) | avgSim ${ca.avgSimilarity} → ${cb.avgSimilarity} (${simDelta >= 0 ? "+" : ""}${simDelta.toFixed(3)})`,
      );
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const saveIdx = args.indexOf("--save");
  const compareIdx = args.indexOf("--compare");

  const data = await runBenchmark();

  if (saveIdx >= 0 && args[saveIdx + 1]) {
    const out = path.resolve(args[saveIdx + 1]!);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(data, null, 2));
    console.log(`Guardado: ${out}`);
  }

  if (compareIdx >= 0 && args[compareIdx + 1] && args[compareIdx + 2]) {
    compareFiles(path.resolve(args[compareIdx + 1]!), path.resolve(args[compareIdx + 2]!));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
