import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractInitialProps, parseSearchResults } from "../initial-props";
import { parseSearchPage } from "../parse";
import { mapCochesNetAd } from "../map";
import type { ComparableQuery } from "../../../../types/listing";

const fixturesDir = path.join(import.meta.dirname, "..", "__fixtures__");
const jsonFixture = fs.readFileSync(path.join(fixturesDir, "search-initial-props.html"), "utf8");
/** Esta fixture quedó truncada a 450 KB, así que su JSON no es parseable a propósito. */
const truncatedFixture = fs.readFileSync(path.join(fixturesDir, "search-page-1.html"), "utf8");
/** Página real con cards SSR y JSON completo: permite comparar ambas vías. */
const cardsAndJsonFixture = fs.readFileSync(
  path.join(fixturesDir, "search-cards-and-json.html"),
  "utf8",
);

const query: ComparableQuery = {
  brand: "BMW",
  model: "X1",
  year: 2019,
  mileage: 95000,
  fuel: "diesel",
};

describe("extractInitialProps", () => {
  it("decodifica el literal escapado de JSON.parse", () => {
    const props = extractInitialProps(jsonFixture) as {
      initialResults: { items: unknown[]; totalResults: number; totalPages: number };
    };
    assert.ok(props);
    assert.equal(props.initialResults.items.length, 6);
    assert.equal(props.initialResults.totalResults, 121);
    assert.equal(props.initialResults.totalPages, 5);
  });

  it("devuelve null si la página no trae el marcador", () => {
    assert.equal(extractInitialProps("<html><body>nada</body></html>"), null);
  });

  it("devuelve null si el JSON está truncado", () => {
    assert.equal(extractInitialProps(truncatedFixture), null);
  });
});

describe("parseSearchResults", () => {
  it("descarta anuncios que no validan sin tirar el lote", () => {
    const payload = {
      initialResults: {
        totalResults: 2,
        totalPages: 1,
        items: [{ id: "123", price: 1000 }, { price: 2000 }],
      },
    };
    const html = `<script>window.__INITIAL_PROPS__ = JSON.parse(${JSON.stringify(
      JSON.stringify(payload),
    )});</script>`;

    const result = parseSearchResults(html);
    assert.ok(result);
    assert.equal(result.items.length, 1);
    assert.equal(result.invalidCount, 1);
  });

  it("devuelve null si no hay items", () => {
    const html = `<script>window.__INITIAL_PROPS__ = JSON.parse(${JSON.stringify(
      JSON.stringify({ initialResults: { items: [] } }),
    )});</script>`;
    assert.equal(parseSearchResults(html), null);
  });
});

describe("parseSearchPage", () => {
  it("prefiere el JSON de hidratación y expone los totales", () => {
    const page = parseSearchPage(jsonFixture, { brand: "BMW", model: "X1" });
    assert.equal(page.source, "initial_props");
    assert.equal(page.ads.length, 6);
    assert.equal(page.totalResults, 121);
    assert.equal(page.totalPages, 5);
  });

  it("mapea los campos del JSON al formato interno", () => {
    const ad = parseSearchPage(jsonFixture, { brand: "BMW", model: "X1" }).ads[0];
    assert.ok(ad);
    assert.equal(ad.id, "70787172");
    assert.equal(ad.fuel, "diesel", "el literal 'Diésel' debe mapear a FuelType");
    assert.equal(ad.mileage, 98230);
    assert.equal(ad.power, 190);
    assert.equal(ad.year, 2019);
    assert.equal(ad.sellerType, "dealer", "isProfessional true debe ser dealer");
    assert.equal(ad.version, "sDrive20dA");
    assert.equal(ad.parsedFrom, "initial_props");
    assert.ok(ad.url.startsWith("https://www.coches.net/"));
    assert.ok((ad.photos?.length ?? 0) > 0);
    assert.ok(ad.publicationDate);
  });

  it("cae al parser de cards cuando el JSON no sirve", () => {
    const page = parseSearchPage(truncatedFixture, { brand: "BMW", model: "X1" });
    assert.equal(page.source, "cards");
    assert.ok(page.ads.length >= 3);
    assert.equal(page.ads[0]?.parsedFrom, "cards");
  });
});

describe("rendimiento del JSON frente a las cards", () => {
  it("extrae muchos más anuncios que el parser de cards en la misma página", () => {
    const viaJson = parseSearchPage(cardsAndJsonFixture, { brand: "BMW", model: "X1" });
    // Neutralizar el marcador fuerza el camino de las cards sobre el mismo HTML.
    const viaCards = parseSearchPage(
      cardsAndJsonFixture.replace(/__INITIAL_PROPS__/g, "__DISABLED__"),
      { brand: "BMW", model: "X1" },
    );

    assert.equal(viaJson.source, "initial_props");
    assert.equal(viaCards.source, "cards");
    assert.equal(viaJson.ads.length, 35);
    assert.ok(
      viaJson.ads.length > viaCards.ads.length * 3,
      `JSON=${viaJson.ads.length} cards=${viaCards.ads.length}: se esperaba al menos 3× más`,
    );
  });

  it("solo la vía JSON aporta fotos y fecha de publicación", () => {
    const viaJson = parseSearchPage(cardsAndJsonFixture, { brand: "BMW", model: "X1" });
    const viaCards = parseSearchPage(
      cardsAndJsonFixture.replace(/__INITIAL_PROPS__/g, "__DISABLED__"),
      { brand: "BMW", model: "X1" },
    );

    assert.ok(viaJson.ads.every((ad) => (ad.photos?.length ?? 0) > 0));
    assert.ok(viaJson.ads.every((ad) => Boolean(ad.publicationDate)));
    assert.ok(viaCards.ads.every((ad) => ad.photos == null));
  });
});

describe("mapCochesNetAd con datos del JSON", () => {
  it("traslada fotos, días en mercado y origen a VehicleListing", () => {
    const ad = parseSearchPage(jsonFixture, { brand: "BMW", model: "X1" }).ads[0]!;
    const listing = mapCochesNetAd(ad, query, new Date().toISOString());

    assert.ok(listing);
    assert.ok((listing.images?.length ?? 0) > 0);
    assert.equal(listing.rawData?.parsedFrom, "initial_props");
    assert.equal(typeof listing.rawData?.daysOnMarket, "number");
    assert.ok((listing.rawData?.daysOnMarket as number) >= 0);
    assert.equal(listing.sellerType, "dealer");
  });

  it("descarta anuncios sin precio", () => {
    const ad = parseSearchPage(jsonFixture, { brand: "BMW", model: "X1" }).ads[0]!;
    assert.equal(mapCochesNetAd({ ...ad, price: undefined }, query, new Date().toISOString()), null);
  });
});
