import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { valueOnMarket } from "@/lib/valuation/market-engine";
import { detectMissingData } from "@/lib/valuation/missing-data";
import { validateVehicleConsistency } from "@/lib/vehicles/identity/consistency";
import { buildTechnicalKnowledge } from "@/lib/vehicles/technical-knowledge";
import type { Vehicle } from "@/types/vehicle";

function vehicle(partial: Partial<Vehicle> & Pick<Vehicle, "brand" | "model" | "year" | "mileage" | "fuel">): Vehicle {
  return {
    brand: partial.brand,
    model: partial.model,
    year: partial.year,
    mileage: partial.mileage,
    fuel: partial.fuel,
    version: partial.version,
    power: partial.power,
    transmission: partial.transmission,
    advertisedPrice: partial.advertisedPrice,
    bodyType: partial.bodyType,
  };
}

describe("VehicleConsistencyValidator", () => {
  it("Caso 1: BMW X1 sDrive18d válido", () => {
    const id = validateVehicleConsistency(
      vehicle({
        brand: "BMW",
        model: "X1",
        version: "sDrive18d",
        year: 2019,
        mileage: 90000,
        fuel: "diesel",
        power: 150,
      }),
    );
    assert.equal(id.status, "ok");
    assert.equal(id.safeForTechnicalKnowledge, true);
  });

  it("Caso 2: Ebro S800 con motor coherente", () => {
    const id = validateVehicleConsistency(
      vehicle({
        brand: "Ebro",
        model: "S800",
        version: "1.5 TGDI",
        year: 2025,
        mileage: 12000,
        fuel: "petrol",
        power: 147,
      }),
    );
    assert.equal(id.status, "ok");
  });

  it("Caso 3: Ebro S800 + sDrive18d inválido", () => {
    const id = validateVehicleConsistency(
      vehicle({
        brand: "Ebro",
        model: "S800",
        version: "sDrive18d",
        year: 2026,
        mileage: 12000,
        fuel: "electric",
        power: 220,
        advertisedPrice: 29000,
      }),
    );
    assert.equal(id.status, "invalid");
    assert.equal(id.safeForTechnicalKnowledge, false);
  });

  it("Caso 4: eléctrico puede generar preguntas de batería", () => {
    const v = vehicle({
      brand: "Tesla",
      model: "Model 3",
      version: "Long Range",
      year: 2021,
      mileage: 60000,
      fuel: "electric",
      power: 498,
    });
    const id = validateVehicleConsistency(v);
    const knowledge = buildTechnicalKnowledge(id);
    const questions = buildSellerQuestions(id, v, knowledge);
    assert.ok(questions.some((q) => /bater/i.test(q.question)));
  });

  it("Caso 5: gasolina NO pregunta por batería HV", () => {
    const v = vehicle({
      brand: "Volkswagen",
      model: "Golf",
      version: "1.5 TSI",
      year: 2019,
      mileage: 70000,
      fuel: "petrol",
      power: 150,
    });
    const id = validateVehicleConsistency(v);
    const knowledge = buildTechnicalKnowledge(id);
    const questions = buildSellerQuestions(id, v, knowledge);
    assert.ok(!questions.some((q) => /bater[ií]a hv|soh|alto voltaje/i.test(q.question)));
  });

  it("Caso 6: diésel NO pregunta por bomba de calor", () => {
    const v = vehicle({
      brand: "Renault",
      model: "Clio",
      version: "1.5 dCi",
      year: 2014,
      mileage: 150000,
      fuel: "diesel",
      power: 90,
    });
    const id = validateVehicleConsistency(v);
    const knowledge = buildTechnicalKnowledge(id);
    const questions = buildSellerQuestions(id, v, knowledge);
    assert.ok(!questions.some((q) => /bomba de calor|heat pump/i.test(q.question)));
  });

  it("Caso 7: sin anuncios → sin mercado", () => {
    const v = vehicle({
      brand: "Ebro",
      model: "S800",
      year: 2025,
      mileage: 12000,
      fuel: "petrol",
      advertisedPrice: 29000,
    });
    const id = validateVehicleConsistency(v);
    const market = valueOnMarket({ vehicle: v, identity: id, listings: [], searchNotes: [] });
    assert.equal(market.status, "unavailable");
    assert.equal(market.estimatedPrice, null);
  });

  it("Caso 8: 1 anuncio → confianza muy baja / insufficient", () => {
    const v = vehicle({
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 90000,
      fuel: "diesel",
      advertisedPrice: 22000,
    });
    const id = validateVehicleConsistency(v);
    const market = valueOnMarket({
      vehicle: v,
      identity: id,
      listings: [
        {
          id: "1",
          source: "coches.net",
          title: "BMW X1",
          brand: "BMW",
          model: "X1",
          year: 2019,
          mileage: 88000,
          fuel: "diesel",
          price: 21500,
          similarity: 0.9,
          isDemo: false,
          fetchedAt: new Date().toISOString(),
          dataKind: "dynamic",
        },
      ],
      searchNotes: [],
    });
    assert.equal(market.status, "insufficient");
    assert.ok(["very_low", "none", "low"].includes(market.confidence.level));
  });

  it("Caso 10: datos incompletos piden versión/motor", () => {
    const v = vehicle({
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 90000,
      fuel: "diesel",
    });
    const id = validateVehicleConsistency(v);
    const market = valueOnMarket({ vehicle: v, identity: id, listings: [], searchNotes: [] });
    const missing = detectMissingData(v, id, market);
    assert.ok(missing.items.some((item: { field: string }) => item.field === "version" || item.field === "power"));
  });
});

describe("RAG anti-contamination", () => {
  it("Ebro S800 eléctrico inválido bloquea conocimiento técnico", () => {
    const id = validateVehicleConsistency(
      vehicle({
        brand: "Ebro",
        model: "S800",
        version: "sDrive18d",
        year: 2026,
        mileage: 12000,
        fuel: "electric",
        power: 220,
      }),
    );
    const knowledge = buildTechnicalKnowledge(id);
    assert.equal(knowledge.status, "blocked");
    assert.equal(knowledge.modelSpecific.length, 0);
    assert.ok(!knowledge.modelSpecific.some((f) => /ckp|p0118|octovalve/i.test(f.title)));
  });

  it("BMW X1 diésel no recibe averías exclusivas de eléctricos", () => {
    const id = validateVehicleConsistency(
      vehicle({
        brand: "BMW",
        model: "X1",
        version: "sDrive18d",
        year: 2019,
        mileage: 90000,
        fuel: "diesel",
        power: 150,
      }),
    );
    const knowledge = buildTechnicalKnowledge(id);
    const all = [...knowledge.modelSpecific, ...knowledge.platformShared].map((f) => f.title);
    assert.ok(!all.some((t) => /octovalve|soh|heat pump/i.test(t)));
  });
});

describe("Hallucination battery", () => {
  const absurd: Array<[string, string, string, Vehicle["fuel"]]> = [
    ["BMW", "Model 3", "", "electric"],
    ["Ferrari", "F430", "1.5 dCi", "diesel"],
    ["Ebro", "S800", "sDrive18d", "electric"],
    ["Tesla", "Model 3", "", "diesel"],
    ["Toyota", "Prius", "V8 5.0 gasolina", "petrol"],
  ];

  for (const [brand, model, version, fuel] of absurd) {
    it(`${brand} ${model} ${version} ${fuel} → invalid or suspicious`, () => {
      const id = validateVehicleConsistency(
        vehicle({ brand, model, version, year: 2018, mileage: 50000, fuel }),
      );
      assert.notEqual(id.status, "ok");
    });
  }
});
