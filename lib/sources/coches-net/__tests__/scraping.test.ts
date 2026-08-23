import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseSearchHtml, parseListingUrl } from "../parse";
import { parseListingHtml } from "../parse-listing";
import { mapAndFilterCochesNetAds } from "../map";
import { buildSearchUrl, buildSearchUrlFromQuery } from "../slug";

const fixturesDir = path.join(import.meta.dirname, "..", "__fixtures__");

describe("parseSearchHtml", () => {
  it("parses ads from fixture", () => {
    const html = fs.readFileSync(path.join(fixturesDir, "search-page-1.html"), "utf8");
    const ads = parseSearchHtml(html, { brand: "BMW", model: "X1" });
    assert.ok(ads.length >= 3);
    assert.ok(ads.every((ad) => ad.id && ad.title));
    const withPrice = ads.filter((ad) => ad.price && ad.price > 5000);
    assert.ok(withPrice.length >= 2);
  });
});

describe("parseListingHtml", () => {
  it("extracts description and equipment from fixture", () => {
    const html = fs.readFileSync(path.join(fixturesDir, "listing-detail.html"), "utf8");
    const detail = parseListingHtml(html, "https://www.coches.net/test-covo.aspx");
    assert.equal(detail.price, 22490);
    assert.equal(detail.mileage, 85000);
    assert.ok(detail.description && detail.description.length > 40);
    assert.ok(detail.equipment?.includes("navegador"));
    assert.equal(detail.daysOnMarket, 12);
  });
});

describe("mapAndFilterCochesNetAds", () => {
  it("filters BMW X1 2019 diesel with strictness", () => {
    const html = fs.readFileSync(path.join(fixturesDir, "search-page-1.html"), "utf8");
    const ads = parseSearchHtml(html, { brand: "BMW", model: "X1" });
    const result = mapAndFilterCochesNetAds(ads, {
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 75000,
      fuel: "diesel",
    }, { fetchedAt: new Date().toISOString(), limit: 20, yearWindow: 2 });
    assert.ok(result.listings.length >= 1);
    assert.ok(result.coreCount >= 1);
  });
});

describe("buildSearchUrl", () => {
  it("includes year and fuel path segments", () => {
    const url = buildSearchUrl("BMW", "X1", 1, { year: 2019, fuel: "diesel" });
    assert.match(url, /\/2019\/diesel\/$/);
  });

  it("buildSearchUrlFromQuery matches filters", () => {
    const url = buildSearchUrlFromQuery({
      brand: "BMW",
      model: "X1",
      year: 2019,
      fuel: "diesel",
    });
    assert.match(url, /bmw\/x1\/segunda-mano\/2019\/diesel/);
  });
});

describe("parseListingUrl", () => {
  it("parses fixture URLs", () => {
    const urls = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, "urls.json"), "utf8"),
    ) as string[];
    for (const url of urls) {
      const parsed = parseListingUrl(url);
      assert.ok(parsed?.id);
      assert.ok(parsed.brand);
    }
  });
});
