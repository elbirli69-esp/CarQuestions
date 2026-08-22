import fs from "node:fs";
import path from "node:path";
import { fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import { buildSearchUrlFromQuery } from "@/lib/sources/coches-net/slug";

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "lib/sources/coches-net/__fixtures__");
  fs.mkdirSync(outDir, { recursive: true });

  const query = { brand: "BMW", model: "X1", year: 2019, mileage: 75000, fuel: "diesel" as const };
  const url = buildSearchUrlFromQuery(query, 1);
  console.log("Fetching:", url);
  const html = await fetchCochesNetHtml(url);
  const out = path.join(outDir, "search-page-1.html");
  fs.writeFileSync(out, html.slice(0, 450000));
  console.log(`Written ${out} (${Math.min(html.length, 450000)} bytes)`);

  const urls = JSON.parse(
    fs.readFileSync(path.join(outDir, "urls.json"), "utf8"),
  ) as string[];
  const first = urls[0];
  if (first) {
    try {
      const listingHtml = await fetchCochesNetHtml(first);
      fs.writeFileSync(path.join(outDir, "listing-detail-live.html"), listingHtml.slice(0, 200000));
      console.log("Listing live HTML captured");
    } catch (e) {
      console.warn("Listing capture failed:", e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
