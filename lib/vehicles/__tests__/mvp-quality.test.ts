import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyChunkEvidence, isModelSpecificEvidence } from "@/lib/vehicles/evidence";
import { validateVehicleConsistency } from "@/lib/vehicles/consistency-validator";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { chunksToReliability } from "@/lib/rag/knowledge/to-reliability";
import { valueVehicle } from "@/lib/valuation/engine";
import type { KnowledgeChunk } from "@/types/knowledge";
import type { VehicleListing } from "@/types/listing";
import type { VehicleInput } from "@/types/vehicle";

function baseVehicle(overrides: Partial<VehicleInput> = {}): VehicleInput {
  return {
    brand: "BMW",
    model: "X1",
    version: "sDrive18d",
    year: 2019,
    mileage: 85000,
    fuel: "diesel",
    power: 150,
    transmission: "automatic",
    advertisedPrice: 22000,
    ...overrides,
  };
}

describe("VehicleConsistencyValidator", () => {
  it("Caso 1: BMW X1 sDrive18d válido", () => {
    const result = validateVehicleConsistency(baseVehicle());
    assert.equal(result.isConsistent, true);
    assert.equal(result.severity, "valid");
    assert.equal(result.canUseModelSpecificKnowledge, true);
  });

  it("Caso 3: Ebro S800 + sDrive18d detecta inconsistencia", () => {
    const result = validateVehicleConsistency(
      baseVehicle({
        brand: "Ebro",
        model: "S800",
        version: "sDrive18d",
        fuel: "electric",
        power: 220,
        year: 2026,
        mileage: 12000,
        advertisedPrice: 29000,
      }),
    );
    assert.equal(result.isConsistent, false);
    assert.equal(result.severity, "invalid");
    assert.equal(result.canUseModelSpecificKnowledge, false);
    assert.ok(
      result.issues.some((issue) => issue.code === "version_brand_mismatch"),
      "debe detectar versión BMW en Ebro",
    );
  });

  it("Caso adversario: BMW + Tesla Model 3", () => {
    const result = validateVehicleConsistency(
      baseVehicle({ brand: "BMW", model: "Model 3", version: "Long Range" }),
    );
    assert.equal(result.isConsistent, false);
  });

  it("Caso adversario: Ferrari + 1.5 dCi", () => {
    const result = validateVehicleConsistency(
      baseVehicle({ brand: "Ferrari", model: "California", version: "1.5 dCi" }),
    );
    assert.ok(result.issues.length > 0);
  });

  it("Caso adversario: Tesla + diésel", () => {
    const result = validateVehicleConsistency(
      baseVehicle({ brand: "Tesla", model: "Model 3", fuel: "diesel", version: "Standard" }),
    );
    assert.equal(result.isConsistent, false);
  });

  it("Caso adversario: Toyota Prius + V8", () => {
    const result = validateVehicleConsistency(
      baseVehicle({ brand: "Toyota", model: "Prius", version: "V8 gasolina", fuel: "petrol" }),
    );
    assert.equal(result.isConsistent, false);
  });
});

describe("RAG evidence levels", () => {
  const universalEvChunk: KnowledgeChunk = {
    id: "test-ev",
    type: "issue",
    brands: ["*"],
    fuels: ["electric"],
    title: "Brake-by-wire",
    content: "Avisos de freno en EV",
    source: "test",
    isDemo: true,
  };

  const bmwX1Chunk: KnowledgeChunk = {
    id: "test-bmw",
    type: "issue",
    brands: ["bmw"],
    models: ["x1"],
    title: "BMW X1 issue",
    content: "Problema X1",
    source: "test",
    isDemo: true,
  };

  it("chunk universal EV es nivel C, no específico del modelo", () => {
    const evidence = classifyChunkEvidence(universalEvChunk, {
      brand: "Ebro",
      model: "S800",
      year: 2026,
      mileage: 12000,
      fuel: "electric",
      version: "sDrive18d",
    });
    assert.equal(evidence.level, "C");
    assert.equal(isModelSpecificEvidence(evidence.level), false);
  });

  it("Ebro S800 incoherente no recibe issues de modelo", () => {
    const reliability = chunksToReliability([universalEvChunk, bmwX1Chunk], {
      brand: "Ebro",
      model: "S800",
      year: 2026,
      mileage: 12000,
      fuel: "electric",
      version: "sDrive18d",
    }, { allowModelKnowledge: false });

    assert.equal(reliability.knownIssues.length, 0);
    assert.equal(reliability.available, false);
  });

  it("BMW X1 recibe issue específico cuando existe en corpus", () => {
    const reliability = chunksToReliability([bmwX1Chunk], {
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 85000,
      fuel: "diesel",
      version: "sDrive18d",
    });
    assert.ok(reliability.knownIssues.length > 0);
    assert.equal(reliability.hasModelSpecificEvidence, true);
  });
});

describe("Seller questions fuel relevance", () => {
  it("Caso 5: vehículo gasolina NO pregunta por batería HV", () => {
    const questions = buildSellerQuestions(
      {
        brand: "Seat",
        model: "Ibiza",
        year: 2018,
        mileage: 60000,
        fuel: "petrol",
      },
      [],
      [
        {
          id: "ev-q",
          type: "issue",
          brands: ["*"],
          fuels: ["electric"],
          title: "Batería HV",
          content: "test",
          source: "test",
          askSeller: ["¿Cuál es el SOH de la batería HV?"],
          isDemo: true,
        },
      ],
    );
    assert.ok(!questions.some((q) => /bater[ií]a hv|soh/i.test(q.question)));
  });

  it("Caso 4: vehículo eléctrico SÍ pregunta por batería", () => {
    const questions = buildSellerQuestions(
      {
        brand: "Tesla",
        model: "Model 3",
        year: 2022,
        mileage: 40000,
        fuel: "electric",
      },
      [],
      [],
    );
    assert.ok(questions.some((q) => /bater[ií]a|soh/i.test(q.question)));
  });

  it("Caso 6: diésel NO pregunta por bomba de calor", () => {
    const questions = buildSellerQuestions(
      {
        brand: "Peugeot",
        model: "308",
        year: 2019,
        mileage: 90000,
        fuel: "diesel",
      },
      [],
      [],
    );
    assert.ok(!questions.some((q) => /bomba de calor|heat pump/i.test(q.question)));
  });
});

describe("Valuation confidence", () => {
  it("Caso 7: sin anuncios usa referencia de segmento", () => {
    const result = valueVehicle(
      baseVehicle({ brand: "Ebro", model: "S800", fuel: "electric", version: undefined }),
      [],
    );
    assert.equal(result.comparableCount, 0);
    assert.equal(result.origin, "ai_estimate");
    assert.ok(result.confidence <= 28);
    assert.equal(result.confidenceTier, "muy_baja");
  });

  it("Caso 8: 1 anuncio tiene confianza muy baja", () => {
    const listing: VehicleListing = {
      id: "l1",
      source: "coches.net",
      title: "BMW X1",
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 80000,
      fuel: "diesel",
      price: 21000,
      similarity: 0.9,
      fetchedAt: new Date().toISOString(),
      isDemo: false,
      dataKind: "dynamic",
      rawData: { matchStrictness: "strict" },
    };
    const result = valueVehicle(baseVehicle(), [listing]);
    assert.equal(result.comparableCount, 1);
    assert.ok(result.confidence < 45);
  });

  it("Caso 9: muchos comparables calculan distribución", () => {
    const listings: VehicleListing[] = Array.from({ length: 12 }, (_, i) => ({
      id: `l${i}`,
      source: "coches.net",
      title: "BMW X1",
      brand: "BMW",
      model: "X1",
      year: 2019,
      mileage: 80000 + i * 1000,
      fuel: "diesel",
      price: 20000 + i * 500,
      similarity: 0.85,
      fetchedAt: new Date().toISOString(),
      isDemo: false,
      dataKind: "dynamic" as const,
      rawData: { matchStrictness: "strict" },
    }));
    const result = valueVehicle(baseVehicle(), listings);
    assert.equal(result.distribution.count, 12);
    assert.ok(result.distribution.p10 != null);
    assert.ok(result.distribution.p90 != null);
    assert.ok(result.confidence >= 45);
  });
});
