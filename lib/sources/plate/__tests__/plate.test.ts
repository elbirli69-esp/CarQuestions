import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSpanishPlateDisplay,
  normalizeSpanishPlate,
} from "@/lib/sources/plate/normalize";
import { estimateRegistrationYearFromPlate } from "@/lib/sources/plate/estimate-year";

describe("Spanish plate normalization", () => {
  it("accepts european plates with spaces", () => {
    assert.equal(normalizeSpanishPlate("1234 bcd"), "1234BCD");
    assert.equal(formatSpanishPlateDisplay("1234BCD"), "1234 BCD");
  });

  it("accepts provincial plates", () => {
    assert.equal(normalizeSpanishPlate("M-1234-AB"), "M1234AB");
    assert.equal(formatSpanishPlateDisplay("M1234AB"), "M-1234-AB");
  });

  it("rejects invalid plates", () => {
    assert.equal(normalizeSpanishPlate("ABC"), null);
    assert.equal(normalizeSpanishPlate("1234 AEZ"), null);
  });
});

describe("Plate year estimation", () => {
  it("estimates year for L-series plates", () => {
    const year = estimateRegistrationYearFromPlate("1234LMX");
    assert.ok(year != null);
    assert.ok(year >= 2019 && year <= 2021);
  });
});
