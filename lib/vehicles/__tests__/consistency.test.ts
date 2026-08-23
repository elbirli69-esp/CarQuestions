import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateVehicleConsistency } from "../consistency";
import type { FuelType } from "@/types/vehicle";

function car(partial: {
  brand: string;
  model: string;
  version?: string;
  year?: number;
  fuel: FuelType;
  power?: number;
}) {
  return {
    year: 2022,
    ...partial,
  };
}

describe("VehicleConsistencyValidator", () => {
  it("acepta BMW X1 sDrive18d diésel", () => {
    const report = validateVehicleConsistency(
      car({ brand: "BMW", model: "X1", version: "sDrive18d", fuel: "diesel", power: 150 }),
    );
    assert.equal(report.status, "valid");
  });

  it("acepta Ebro S800 eléctrico con motor coherente", () => {
    const report = validateVehicleConsistency(
      car({ brand: "Ebro", model: "S800", year: 2026, fuel: "electric", power: 220 }),
    );
    assert.equal(report.status, "valid");
  });

  it("detecta Ebro S800 + sDrive18d", () => {
    const report = validateVehicleConsistency(
      car({
        brand: "Ebro",
        model: "S800",
        version: "sDrive18d",
        year: 2026,
        fuel: "electric",
        power: 220,
      }),
    );
    assert.equal(report.status, "invalid");
    assert.match(report.summary, /sDrive18d/i);
    assert.ok(report.discardedFields.includes("version"));
  });

  it("detecta BMW + Tesla Model 3", () => {
    const report = validateVehicleConsistency(car({ brand: "BMW", model: "Tesla Model 3", fuel: "electric" }));
    assert.equal(report.status, "invalid");
  });

  it("detecta Ferrari + 1.5 dCi", () => {
    const report = validateVehicleConsistency(
      car({ brand: "Ferrari", model: "488", version: "1.5 dCi", fuel: "diesel" }),
    );
    assert.equal(report.status, "invalid");
  });

  it("detecta Tesla + diésel", () => {
    const report = validateVehicleConsistency(car({ brand: "Tesla", model: "Model 3", fuel: "diesel" }));
    assert.equal(report.status, "invalid");
  });

  it("detecta Toyota Prius + V8 gasolina", () => {
    const report = validateVehicleConsistency(
      car({ brand: "Toyota", model: "Prius", version: "V8 gasolina", fuel: "petrol", power: 400 }),
    );
    assert.equal(report.status, "invalid");
  });
});
