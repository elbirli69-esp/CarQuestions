/**
 * Mide, sin tocar la red, cuántos anuncios y campos rinde cada vía de parseo
 * sobre la misma página de resultados.
 *
 * Uso:
 *   npm run scraping:yield                     # usa las fixtures del repo
 *   npm run scraping:yield -- pagina.html …    # usa páginas descargadas
 */

import fs from "node:fs";
import path from "node:path";
import { parseSearchPage } from "@/lib/sources/coches-net/parse";

const DEFAULT_FILES = [
  "lib/sources/coches-net/__fixtures__/search-cards-and-json.html",
  "lib/sources/coches-net/__fixtures__/search-page-1.html",
];

const files = process.argv.slice(2);
const targets = files.length > 0 ? files : DEFAULT_FILES;

let anyMissing = false;

for (const file of targets) {
  const full = path.resolve(file);
  if (!fs.existsSync(full)) {
    console.log(`${file}: no existe`);
    anyMissing = true;
    continue;
  }

  const html = fs.readFileSync(full, "utf8");
  const context = { brand: "BMW", model: "X1" };

  const viaJson = parseSearchPage(html, context);
  // Neutralizar el marcador fuerza el camino antiguo sobre el mismo HTML.
  const viaCards = parseSearchPage(html.replace(/__INITIAL_PROPS__/g, "__DISABLED__"), context);

  const jsonFields = viaJson.ads[0] ? Object.keys(viaJson.ads[0]).length : 0;
  const cardFields = viaCards.ads[0] ? Object.keys(viaCards.ads[0]).length : 0;
  const withPhotos = viaJson.ads.filter((ad) => (ad.photos?.length ?? 0) > 0).length;

  console.log(`\n${path.basename(file)}`);
  console.log(`  vía JSON:  ${viaJson.ads.length} anuncios, ${jsonFields} campos (${viaJson.source})`);
  console.log(`  vía cards: ${viaCards.ads.length} anuncios, ${cardFields} campos`);
  if (viaCards.ads.length > 0 && viaJson.source === "initial_props") {
    console.log(`  ganancia:  ${(viaJson.ads.length / viaCards.ads.length).toFixed(1)}×`);
  }
  console.log(`  con fotos: ${withPhotos}/${viaJson.ads.length}`);
  if (viaJson.totalResults != null) {
    console.log(`  el portal declara ${viaJson.totalResults} anuncios en ${viaJson.totalPages} páginas`);
  }
}

if (anyMissing) process.exitCode = 1;
