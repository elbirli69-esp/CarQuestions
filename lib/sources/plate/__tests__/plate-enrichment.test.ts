import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listFilledPlateFields,
  listMissingAfterPlate,
} from "@/lib/sources/plate/field-report";
import { mergeVehiclePatches } from "@/lib/sources/plate/merge-vehicle";
import { mapBodyTypeLabel } from "@/lib/sources/plate/map-body-type";

describe("plate field report", () => {
  it("lists filled and missing fields", () => {
    const filled = listFilledPlateFields({
      brand: "BMW",
      model: "X1",
      year: 2019,
      fuel: "diesel",
      vin: "WBAVL31020VS12345",
    });
    assert.ok(filled.includes("brand"));
    assert.ok(filled.includes("vin"));

    const missing = listMissingAfterPlate({
      brand: "BMW",
      year: 2019,
    });
    assert.ok(missing.includes("mileage"));
    assert.ok(missing.includes("advertisedPrice"));
  });
});

describe("mergeVehiclePatches", () => {
  it("merges without overwriting existing values", () => {
    const merged = mergeVehiclePatches(
      { brand: "BMW", year: 2018 },
      { brand: "AUDI", model: "A3", year: 2020, power: 150 },
    );
    assert.equal(merged.brand, "BMW");
    assert.equal(merged.model, "A3");
    assert.equal(merged.year, 2018);
    assert.equal(merged.power, 150);
  });
});

describe("mapBodyTypeLabel", () => {
  it("maps MPV to estate", () => {
    assert.equal(mapBodyTypeLabel("MPV"), "estate");
  });
});
