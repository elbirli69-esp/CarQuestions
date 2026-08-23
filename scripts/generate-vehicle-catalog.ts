import fs from "node:fs";
import path from "node:path";
import { fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import {
  extractBrandSlugsFromHtml,
  extractModelSlugsFromHtml,
  slugToBrandName,
  slugToModelName,
  type CatalogBrand,
  type VehicleCatalog,
} from "@/lib/vehicles/catalog-types";

const DELAY_MS = 500;
const CONCURRENCY = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function run(): Promise<void> {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      results[i] = await worker(items[i]!);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run()));
  return results;
}

async function fetchBrandModels(slug: string, attempts = 3): Promise<CatalogBrand> {
  const cachePath = path.join(process.cwd(), "data/catalog-cache", `${slug}.html`);
  const url = `https://www.coches.net/${slug}/segunda-mano/`;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      let html: string;
      if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 120000) {
        html = fs.readFileSync(cachePath, "utf8");
      } else if (process.env.CATALOG_CACHE_ONLY === "1") {
        throw new Error("cache missing or too small");
      } else {
        html = await fetchCochesNetHtml(url);
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, html.slice(0, 2_000_000));
      }
      const modelSlugs = extractModelSlugsFromHtml(html, slug);
      const models = modelSlugs.map((modelSlug) => ({
        slug: modelSlug,
        name: slugToModelName(modelSlug),
      }));
      console.log(`  ${slug}: ${models.length} models`);
      return { slug, name: slugToBrandName(slug), models };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < attempts - 1) {
        console.warn(`  ${slug}: retry ${attempt + 1} (${message})`);
        await sleep(2000 * (attempt + 1));
      } else {
        console.warn(`  ${slug}: failed ${message}`);
      }
    }
  }
  return { slug, name: slugToBrandName(slug), models: [] };
}

async function main(): Promise<void> {
  const outPath = path.join(process.cwd(), "data/vehicle-catalog.json");
  const slugsPath = path.join(process.cwd(), "data/coches-net-brand-slugs.json");
  let existing: VehicleCatalog | null = null;
  if (fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, "utf8")) as VehicleCatalog;
  }

  let brandSlugs: string[] = [];
  try {
    console.log("Fetching coches.net /segunda-mano/ for brands…");
    const indexHtml = await fetchCochesNetHtml("https://www.coches.net/segunda-mano/");
    brandSlugs = extractBrandSlugsFromHtml(indexHtml);
  } catch (error) {
    console.warn("Index fetch failed, using saved slug list.", error);
    if (fs.existsSync(slugsPath)) {
      brandSlugs = JSON.parse(fs.readFileSync(slugsPath, "utf8")) as string[];
    }
  }

  if (brandSlugs.length === 0 && fs.existsSync(slugsPath)) {
    brandSlugs = JSON.parse(fs.readFileSync(slugsPath, "utf8")) as string[];
  }

  if (brandSlugs.length === 0) {
    throw new Error("No brand slugs available");
  }

  fs.writeFileSync(slugsPath, JSON.stringify(brandSlugs, null, 2));
  console.log(`Found ${brandSlugs.length} brand slugs`);

  const existingMap = new Map(
    (existing?.brands ?? []).map((b) => [b.slug, b]),
  );

  const toFetch = brandSlugs.filter((slug) => {
    const prev = existingMap.get(slug);
    return !prev || prev.models.length === 0;
  });

  console.log(`Fetching models for ${toFetch.length} brands (${brandSlugs.length - toFetch.length} cached)…`);

  const fetched = await mapPool(toFetch, (slug) => fetchBrandModels(slug));

  const mergedMap = new Map(existingMap);
  for (const brand of fetched) {
    if (brand.models.length > 0) mergedMap.set(brand.slug, brand);
  }

  const catalog: VehicleCatalog = {
    generatedAt: new Date().toISOString(),
    source: "coches.net",
    brands: [...mergedMap.values()]
      .filter((b) => b.models.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2));
  console.log(
    `Written ${outPath}: ${catalog.brands.length} brands, ${catalog.brands.reduce((s, b) => s + b.models.length, 0)} models`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
