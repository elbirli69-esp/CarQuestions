/**
 * Expande vehicle-trims.json con los 100 modelos VO de spain-used-market-priority.json.
 * Uso: npx tsx scripts/expand-used-market-catalog.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CatalogTrim, TrimCatalogEntry, VehicleTrimCatalog } from "../lib/vehicles/trims-types";

interface UsedMarketModel {
  rank: number;
  brandSlug: string;
  modelSlug: string;
  voYearFrom: number;
  voYearTo: number;
  segment: string;
}

interface UsedMarketFile {
  models: UsedMarketModel[];
}

const ROOT = process.cwd();
const trimsPath = join(ROOT, "data", "vehicle-trims.json");
const usedPath = join(ROOT, "data", "spain-used-market-priority.json");

function defaultTrims(model: UsedMarketModel): CatalogTrim[] {
  const yFrom = model.voYearFrom;
  const yTo = model.voYearTo;
  const seg = model.segment;

  if (seg === "ev") {
    return [
      {
        slug: "electric",
        name: "Electric",
        fuel: "electric",
        yearFrom: yFrom,
        yearTo: yTo,
        transmission: "automatic",
        label: "Eléctrico · mercado VO",
      },
    ];
  }

  if (seg === "hybrid") {
    return [
      {
        slug: "hybrid",
        name: "Hybrid",
        fuel: "hybrid",
        yearFrom: yFrom,
        yearTo: yTo,
        transmission: "automatic",
        label: "Híbrido · mercado VO",
      },
      {
        slug: "petrol",
        name: "Petrol",
        fuel: "petrol",
        yearFrom: yFrom,
        yearTo: yTo,
        label: "Gasolina · mercado VO",
      },
    ];
  }

  const trims: CatalogTrim[] = [
    {
      slug: "petrol-vo",
      name: "Gasolina",
      fuel: "petrol",
      yearFrom: yFrom,
      yearTo: yTo,
      label: "Gasolina · mercado VO",
    },
  ];

  if (seg !== "b") {
    trims.push({
      slug: "diesel-vo",
      name: "Diésel",
      fuel: "diesel",
      yearFrom: yFrom,
      yearTo: Math.min(yTo, 2024),
      label: "Diésel · mercado VO",
    });
  }

  if (seg === "suv" && yTo >= 2020) {
    trims.push({
      slug: "hybrid-vo",
      name: "Hybrid",
      fuel: "hybrid",
      yearFrom: Math.max(yFrom, 2019),
      yearTo: yTo,
      transmission: "automatic",
      label: "Híbrido · mercado VO",
    });
  }

  return trims;
}

const catalog = JSON.parse(readFileSync(trimsPath, "utf8")) as VehicleTrimCatalog;
const used = JSON.parse(readFileSync(usedPath, "utf8")) as UsedMarketFile;

const entryMap = new Map<string, TrimCatalogEntry>();
for (const entry of catalog.entries) {
  entryMap.set(`${entry.brandSlug}/${entry.modelSlug}`, entry);
}

let added = 0;
let updated = 0;

for (const model of used.models) {
  const key = `${model.brandSlug}/${model.modelSlug}`;
  const existing = entryMap.get(key);

  if (existing) {
    existing.spainUsedMarketRank = model.rank;
    existing.voYearFrom = model.voYearFrom;
    existing.voYearTo = model.voYearTo;
    if (!existing.trims.length) {
      existing.trims = defaultTrims(model);
    }
    updated += 1;
  } else {
    entryMap.set(key, {
      brandSlug: model.brandSlug,
      modelSlug: model.modelSlug,
      spainUsedMarketRank: model.rank,
      voYearFrom: model.voYearFrom,
      voYearTo: model.voYearTo,
      trims: defaultTrims(model),
    });
    added += 1;
  }
}

const entries = [...entryMap.values()].sort(
  (a, b) =>
    (a.spainUsedMarketRank ?? 9999) - (b.spainUsedMarketRank ?? 9999) ||
    a.brandSlug.localeCompare(b.brandSlug) ||
    a.modelSlug.localeCompare(b.modelSlug),
);

const out: VehicleTrimCatalog = {
  generatedAt: new Date().toISOString(),
  source: "curated-motorizations-spain-used-vo-top100",
  entries,
};

writeFileSync(trimsPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`vehicle-trims.json: ${entries.length} modelos (${added} nuevos, ${updated} actualizados)`);
