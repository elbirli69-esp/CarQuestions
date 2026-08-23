import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { valueVehicle } from "../engine";
import type { VehicleListing } from "@/types/listing";
import type { Vehicle } from "@/types/vehicle";

const vehicle: Vehicle = {
  brand: "BMW",
  model: "X1",
  version: "sDrive18d",
  year: 2019,
  mileage: 80000,
  fuel: "diesel",
  advertisedPrice: 22000,
};

function listing(price: number, extra: Partial<VehicleListing> = {}): VehicleListing {
  return {
    id: `l-${price}`,
    source: "coches.net",
    title: "BMW X1",
    brand: "BMW",
    model: "X1",
    year: 2019,
    mileage: 75000,
    fuel: "diesel",
    price,
    isDemo: false,
    fetchedAt: new Date().toISOString(),
    dataKind: "dynamic",
    similarity: 0.85,
    ...extra,
  };
}

describe("Valoración honesta", () => {
  it("sin anuncios no finge mercado", () => {
    const result = valueVehicle(vehicle, []);
    assert.equal(result.marketStatus, "none");
    assert.equal(result.isSegmentReference, true);
    assert.equal(result.comparableCount, 0);
    assert.equal(result.confidenceBand, "muy_baja");
    assert.equal(result.distribution.count, 0);
    assert.match(result.summary, /sin suficientes anuncios comparables/i);
  });

  it("1 anuncio implica confianza muy baja", () => {
    const result = valueVehicle(vehicle, [listing(21000)]);
    assert.equal(result.comparableCount, 1);
    assert.equal(result.confidenceBand, "muy_baja");
    assert.equal(result.marketStatus, "insufficient");
    assert.ok(result.confidence < 40);
  });

  it("muchos comparables calculan distribución real", () => {
    const prices = [18000, 19000, 20000, 21000, 22000, 23000, 24000, 25000, 26000, 27000, 28000, 30000];
    const result = valueVehicle(
      vehicle,
      prices.map((price, index) => listing(price, { id: `l-${index}`, mileage: 70000 + index * 1000 })),
    );
    assert.equal(result.marketStatus, "observed");
    assert.ok(result.distribution.count >= 8);
    assert.ok((result.distribution.p10 ?? 0) > 0);
    assert.ok((result.distribution.p90 ?? 0) >= (result.distribution.p10 ?? 0));
    assert.ok(result.distribution.median > 0);
    assert.notEqual(result.confidenceBand, "muy_baja");
  });
});
