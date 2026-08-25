import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupPlateLocally } from "@/lib/sources/plate/providers/local";
import { parseProvincialPlate } from "@/lib/sources/plate/provincial";

describe("provincial plate parsing", () => {
  it("maps Madrid provincial plate to location", () => {
    const parsed = parseProvincialPlate("M1234AB");
    assert.equal(parsed.location, "Madrid");
    assert.equal(parsed.provinceCode, "M");
  });

  it("local lookup adds year for european plate", () => {
    const vehicle = lookupPlateLocally("1234LMX");
    assert.ok(vehicle.year != null);
    assert.equal(vehicle.registrationPlate, "1234 LMX");
  });

  it("local lookup adds province for old plate", () => {
    const vehicle = lookupPlateLocally("B4321CD");
    assert.equal(vehicle.location, "Barcelona");
  });
});
