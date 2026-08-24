import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseListingHtml } from "@/lib/sources/autoscout24/parse-listing";
import { parseListingUrl, parseSearchHtml } from "@/lib/sources/autoscout24/parse";
import { buildSearchUrlFromQuery } from "@/lib/sources/autoscout24/slug";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "__fixtures__");

describe("AutoScout24 scraping", () => {
  it("builds search URL from comparable query", () => {
    const url = buildSearchUrlFromQuery({
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 50000,
      fuel: "diesel",
    });
    assert.match(url, /autoscout24\.es\/lst\/bmw\/x1/);
    assert.match(url, /page=1/);
  });

  it("parses search results JSON-LD", () => {
    const html = readFileSync(join(fixturesDir, "search-page-1.html"), "utf8");
    const ads = parseSearchHtml(html, { brand: "BMW", model: "X1" });
    assert.ok(ads.length >= 5);
    assert.ok(ads.every((ad) => ad.price && ad.price > 0));
    assert.ok(ads.some((ad) => ad.title.toLowerCase().includes("x1")));
  });

  it("parses listing detail JSON-LD", () => {
    const html = readFileSync(join(fixturesDir, "listing-detail.html"), "utf8");
    const url =
      "https://www.autoscout24.es/anuncios/bmw-x1-sdrive-18ia-gasolina-negro-cat_ma13mo19242-0f88b622-d31f-499b-a221-bae5c97673c2";
    const detail = parseListingHtml(html, url);
    assert.equal(detail.price, 19490);
    assert.equal(detail.mileage, 41016);
    assert.equal(detail.fuel, "petrol");
    assert.ok(detail.power && detail.power > 100);
  });

  it("parses listing URL slug", () => {
    const parsed = parseListingUrl(
      "https://www.autoscout24.es/anuncios/bmw-x1-sdrive-18ia-gasolina-negro-cat_ma13mo19242-0f88b622-d31f-499b-a221-bae5c97673c2",
    );
    assert.ok(parsed);
    assert.equal(parsed!.id, "0f88b622-d31f-499b-a221-bae5c97673c2");
    assert.equal(parsed!.brand, "Bmw");
    assert.equal(parsed!.model, "x1");
    assert.equal(parsed!.fuel, "petrol");
  });
});
