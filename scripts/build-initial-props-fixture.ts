/**
 * Genera una fixture ligera con el formato real de `window.__INITIAL_PROPS__`
 * a partir de una página de resultados descargada.
 *
 * Uso: tsx scripts/build-initial-props-fixture.ts <pagina.html>
 */

import fs from "node:fs";
import path from "node:path";
import { extractInitialProps } from "@/lib/sources/coches-net/initial-props";

const MAX_ADS = 6;
const MAX_PHOTOS = 3;
/** Para la fixture comparativa conservamos todos los anuncios del JSON. */
const COMPARISON_MAX_PHOTOS = 1;

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error("Indica un HTML de resultados existente.");
  process.exit(1);
}

const props = extractInitialProps(fs.readFileSync(input, "utf8"));
if (!props || typeof props !== "object") {
  console.error("La página no contiene __INITIAL_PROPS__ utilizable.");
  process.exit(1);
}

const results = (props as Record<string, unknown>).initialResults as {
  items: Record<string, unknown>[];
  totalResults?: number;
  totalPages?: number;
};

const trimmed = {
  initialResults: {
    totalResults: results.totalResults,
    totalPages: results.totalPages,
    items: results.items.slice(0, MAX_ADS).map((ad) => ({
      ...ad,
      photos: Array.isArray(ad.photos) ? (ad.photos as string[]).slice(0, MAX_PHOTOS) : undefined,
      videos: undefined,
      phone: undefined,
    })),
  },
};

// El portal serializa el JSON como literal de string dentro de JSON.parse("…").
const escaped = JSON.stringify(JSON.stringify(trimmed)).slice(1, -1);

const html = `<!DOCTYPE html>
<html lang="es">
<head><title>Fixture resultados coches.net</title></head>
<body>
<div id="root"></div>
<script>window.__INITIAL_PROPS__ = JSON.parse("${escaped}");</script>
</body>
</html>
`;

const out = path.join(
  process.cwd(),
  "lib/sources/coches-net/__fixtures__/search-initial-props.html",
);
fs.writeFileSync(out, html);
console.log(
  `Escrito ${out} (${html.length} bytes, ${trimmed.initialResults.items.length} anuncios)`,
);

// Segunda fixture: cards SSR reales + JSON completo, para comparar en igualdad
// de condiciones cuántos anuncios rinde cada vía sobre la misma página.
const original = fs.readFileSync(input, "utf8");
const cardsStart = original.indexOf('<div data-ad-position="0"');
const cardsEnd = original.lastIndexOf("mt-CardAd-footer");
if (cardsStart > 0 && cardsEnd > cardsStart) {
  const cardsMarkup = original.slice(cardsStart, cardsEnd + 2000);
  const fullJson = {
    initialResults: {
      totalResults: results.totalResults,
      totalPages: results.totalPages,
      items: results.items.map((ad) => ({
        ...ad,
        photos: Array.isArray(ad.photos)
          ? (ad.photos as string[]).slice(0, COMPARISON_MAX_PHOTOS)
          : undefined,
        videos: undefined,
        phone: undefined,
      })),
    },
  };
  const escapedFull = JSON.stringify(JSON.stringify(fullJson)).slice(1, -1);
  const comparisonHtml = `<!DOCTYPE html>
<html lang="es">
<head><title>Fixture comparativa cards vs JSON</title></head>
<body>
<div id="root">${cardsMarkup}</div>
<script>window.__INITIAL_PROPS__ = JSON.parse("${escapedFull}");</script>
</body>
</html>
`;
  const outCompare = path.join(
    process.cwd(),
    "lib/sources/coches-net/__fixtures__/search-cards-and-json.html",
  );
  fs.writeFileSync(outCompare, comparisonHtml);
  console.log(
    `Escrito ${outCompare} (${comparisonHtml.length} bytes, ${fullJson.initialResults.items.length} anuncios en JSON)`,
  );
}
