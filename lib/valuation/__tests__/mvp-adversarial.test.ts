import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateVehicleConsistency } from "@/lib/vehicles/consistency";
import { lookupKnowledge } from "@/lib/vehicles/knowledge-base";
import { buildMissingDataReport } from "@/lib/vehicles/missing-data";
import { buildSellerQuestions } from "../seller-questions";
import { valueVehicle } from "../engine";
import { scoreListingQuality } from "../listing-quality";
import type { Vehicle } from "@/types/vehicle";

describe("Batería adversaria MVP", () => {
  it("caso 1: BMW X1 sDrive18d es coherente", () => {
    const report = validateVehicleConsistency({
      brand: "BMW",
      model: "X1",
      version: "sDrive18d",
      year: 2019,
      fuel: "diesel",
      power: 150,
    });
    assert.equal(report.status, "valid");
  });

  it("caso 2: Ebro S800 válido es coherente", () => {
    const report = validateVehicleConsistency({
      brand: "Ebro",
      model: "S800",
      year: 2026,
      fuel: "electric",
      power: 220,
    });
    assert.equal(report.status, "valid");
  });

  it("caso 3: Ebro + sDrive18d es inválido y no genera RAG", () => {
    const vehicle: Vehicle = {
      brand: "Ebro",
      model: "S800",
      version: "sDrive18d",
      year: 2026,
      mileage: 12000,
      fuel: "electric",
      power: 220,
      advertisedPrice: 29000,
    };
    const report = validateVehicleConsistency(vehicle);
    assert.equal(report.status, "invalid");
    const knowledge = lookupKnowledge(vehicle, { blocked: report.status === "invalid" });
    assert.equal(knowledge.reliability.available, false);
    assert.equal(knowledge.knowledgeChunks.length, 0);
  });

  it("caso 4: EV pregunta por batería", () => {
    const questions = buildSellerQuestions(
      { brand: "Tesla", model: "Model 3", year: 2021, mileage: 40000, fuel: "electric" },
      [],
      [],
    );
    assert.ok(questions.some((item) => /bater/i.test(item.question)));
  });

  it("caso 5: gasolina no pregunta HV", () => {
    const questions = buildSellerQuestions(
      { brand: "Toyota", model: "Corolla", year: 2020, mileage: 50000, fuel: "petrol" },
      [],
      [],
    );
    assert.doesNotMatch(questions.map((item) => item.question).join(" "), /bater[ií]a hv|soh/i);
  });

  it("caso 6: diésel no pregunta bomba de calor", () => {
    const questions = buildSellerQuestions(
      { brand: "BMW", model: "X1", year: 2018, mileage: 90000, fuel: "diesel" },
      [],
      [],
    );
    assert.doesNotMatch(questions.map((item) => item.question).join(" "), /bomba de calor/i);
  });

  it("caso 7: sin anuncios muestra sin mercado comparable", () => {
    const result = valueVehicle(
      { brand: "Ebro", model: "S800", year: 2026, mileage: 12000, fuel: "electric", advertisedPrice: 29000 },
      [],
    );
    assert.match(result.summary, /sin suficientes anuncios comparables/i);
    assert.equal(result.marketStatus, "none");
  });

  it("caso 8: 1 anuncio = confianza muy baja", () => {
    const result = valueVehicle(
      { brand: "BMW", model: "X1", year: 2019, mileage: 80000, fuel: "diesel", advertisedPrice: 22000 },
      [
        {
          id: "one",
          source: "coches.net",
          title: "BMW X1",
          brand: "BMW",
          model: "X1",
          year: 2019,
          mileage: 70000,
          fuel: "diesel",
          price: 21000,
          isDemo: false,
          fetchedAt: new Date().toISOString(),
          dataKind: "dynamic",
          similarity: 0.8,
        },
      ],
    );
    assert.equal(result.confidenceBand, "muy_baja");
  });

  it("caso 9: muchos comparables producen percentiles", () => {
    const listings = Array.from({ length: 14 }, (_, index) => ({
      id: `n-${index}`,
      source: "coches.net",
      title: "BMW X1",
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 60000 + index * 2000,
      fuel: "diesel" as const,
      price: 18000 + index * 800,
      isDemo: false,
      fetchedAt: new Date().toISOString(),
      dataKind: "dynamic" as const,
      similarity: 0.82,
    }));
    const result = valueVehicle(
      { brand: "BMW", model: "X1", year: 2019, mileage: 80000, fuel: "diesel", advertisedPrice: 22000 },
      listings,
    );
    assert.ok(result.distribution.p10);
    assert.ok(result.distribution.p90);
    assert.equal(result.marketStatus, "observed");
  });

  it("caso 10: datos incompletos piden los que más importan", () => {
    const report = buildMissingDataReport({
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 80000,
      fuel: "diesel",
    });
    const fields = report.items.map((item) => item.field);
    assert.ok(fields.includes("version"));
    assert.ok(fields.includes("power") || fields.includes("transmission"));
    assert.ok(report.potentialGainPercent >= 20);
    const quality = scoreListingQuality({
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 80000,
      fuel: "diesel",
    });
    assert.ok(quality.score < 50);
    assert.ok(quality.missing.some((item) => item.id === "history"));
  });
});
