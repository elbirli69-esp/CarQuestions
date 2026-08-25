import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VehicleListing } from "@/types/listing";
import type { Vehicle } from "@/types/vehicle";
import { indicatesAccident, valueVehicle } from "@/lib/valuation/engine";
import { buildSellerQuestions } from "@/lib/valuation/seller-questions";
import { analyzeListing } from "@/lib/valuation/listing-analysis";
import { chunkMatchesModel, chunkMatchesVehicle, chunkIsPlatformComponent } from "@/lib/rag/knowledge/filters";
import { chunksToReliability } from "@/lib/rag/knowledge/to-reliability";
import { chunksToSharedComponents } from "@/lib/rag/knowledge/shared-components";
import type { KnowledgeChunk } from "@/types/knowledge";
import { motorCodesMatch, resolveVehicleComponentCodes } from "@/lib/vehicles/component-codes";
import { validateVehicleConsistency } from "@/lib/vehicles/consistency";
import { resolveVehicleIdentity } from "@/lib/vehicles/identity";
import { detectMissingData } from "@/lib/vehicles/missing-data";
import { isAllowedCochesNetListingUrl, isAllowedAutoScout24ListingUrl, isAllowedListingUrl } from "@/lib/vehicles/url-policy";
import { buildInspectionChecklist } from "@/lib/vehicles/inspection-checklist";

function baseVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    brand: "BMW",
    model: "X1",
    version: "sDrive18d",
    year: 2021,
    mileage: 45000,
    fuel: "diesel",
    power: 150,
    transmission: "automatic",
    advertisedPrice: 28900,
    ...overrides,
  };
}

describe("VehicleConsistencyValidator", () => {
  it("Case 1: BMW X1 sDrive18d is valid", () => {
    const report = validateVehicleConsistency(baseVehicle());
    assert.equal(report.status, "valid");
    assert.equal(report.blockModelKnowledge, false);
  });

  it("Case 2: Ebro S800 electric with coherent data is valid or only soft warnings", () => {
    const report = validateVehicleConsistency(
      baseVehicle({
        brand: "Ebro",
        model: "S800",
        version: "Premium",
        year: 2025,
        mileage: 12000,
        fuel: "electric",
        power: 220,
      }),
    );
    assert.notEqual(report.status, "invalid");
    assert.equal(report.blockModelKnowledge, false);
  });

  it("Case 3: Ebro S800 + sDrive18d is INVALID", () => {
    const report = validateVehicleConsistency(
      baseVehicle({
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
    assert.equal(report.status, "invalid");
    assert.equal(report.blockModelKnowledge, true);
    assert.ok(report.issues.some((i) => i.code === "foreign_trim" || i.code === "fuel_trim_conflict"));
    assert.match(report.summary, /sDrive18d|eléctrico|versión/i);
  });

  it("Case hallucination: BMW + Tesla Model 3", () => {
    const report = validateVehicleConsistency(
      baseVehicle({ brand: "BMW", model: "Tesla Model 3", version: undefined, fuel: "electric" }),
    );
    assert.equal(report.status, "invalid");
  });

  it("Case hallucination: Ferrari + 1.5 dCi diesel", () => {
    const report = validateVehicleConsistency(
      baseVehicle({
        brand: "Ferrari",
        model: "488",
        version: "1.5 dCi",
        fuel: "diesel",
        power: 110,
      }),
    );
    assert.equal(report.status, "invalid");
  });

  it("Case hallucination: Tesla + diesel", () => {
    const report = validateVehicleConsistency(
      baseVehicle({ brand: "Tesla", model: "Model 3", fuel: "diesel", version: "Long Range" }),
    );
    assert.equal(report.status, "invalid");
  });

  it("Case hallucination: Toyota Prius + V8", () => {
    const report = validateVehicleConsistency(
      baseVehicle({
        brand: "Toyota",
        model: "Prius",
        version: "V8 5.0",
        fuel: "petrol",
        power: 400,
      }),
    );
    assert.equal(report.status, "invalid");
  });

  it("BMW X1 + catalog trim slug sdrive18d is verified", () => {
    const report = validateVehicleConsistency(baseVehicle(), {
      trimSlug: "sdrive18d",
      trimCatalogVerified: true,
    });
    assert.equal(report.trimCatalogMatch, true);
    assert.equal(report.trimSlug, "sdrive18d");
    assert.notEqual(report.status, "invalid");
  });

  it("Ebro S800 + BMW trim slug triggers foreign_trim_catalog", () => {
    const report = validateVehicleConsistency(
      baseVehicle({
        brand: "Ebro",
        model: "S800",
        version: "sDrive18d",
        year: 2025,
        mileage: 12000,
        fuel: "electric",
        power: 220,
      }),
      { trimSlug: "sdrive18d" },
    );
    assert.equal(report.trimCatalogMatch, false);
    assert.ok(
      report.issues.some((i) => i.code === "foreign_trim_catalog" || i.code === "foreign_trim"),
    );
  });
});

describe("Identity evidence chain", () => {
  it("closes chain with catalog trim for BMW X1 sDrive18d", () => {
    const result = resolveVehicleIdentity(baseVehicle(), { trimSlug: "sdrive18d" });
    assert.equal(result.evidence.trimCatalogMatch, true);
    assert.equal(result.evidence.trimSlug, "sdrive18d");
    assert.equal(result.vehicle.version, "sDrive18d");
    assert.ok(result.evidence.fields.some((f) => f.field === "version" && f.verified));
    assert.match(result.evidence.summary, /catálogo/i);
  });

  it("marks free-text version as unverified when no trim match", () => {
    const result = resolveVehicleIdentity(
      baseVehicle({ brand: "Ebro", model: "S800", version: "sDrive18d", fuel: "electric", power: 220 }),
    );
    assert.equal(result.evidence.trimCatalogMatch, false);
    assert.ok(result.evidence.fields.some((f) => f.field === "version" && !f.verified));
  });
});

describe("Seller questions fuel relevance", () => {
  it("Case 4: EV can ask about battery", () => {
    const qs = buildSellerQuestions(
      baseVehicle({ brand: "Tesla", model: "Model 3", fuel: "electric", version: "Long Range" }),
      [],
      [],
    );
    assert.ok(qs.some((q) => /bater|SOH|salud/i.test(q.question)));
  });

  it("Case 5: petrol must NOT ask about HV battery", () => {
    const qs = buildSellerQuestions(
      baseVehicle({ fuel: "petrol", version: "1.5 TSI" }),
      [],
      [],
    );
    assert.ok(!qs.some((q) => /bater[ií]a\s*(hv|de alta)|SOH|heat\s?pump|bomba de calor/i.test(q.question)));
    assert.ok(qs.some((q) => /distribuci/i.test(q.question)));
  });

  it("Case 6: diesel must NOT ask about heat pump", () => {
    const qs = buildSellerQuestions(baseVehicle({ fuel: "diesel" }), [], []);
    assert.ok(!qs.some((q) => /bomba de calor|heat\s?pump/i.test(q.question)));
    assert.ok(qs.some((q) => /FAP|EGR|ciudad|carretera/i.test(q.question)));
  });

  it("limits to 8 prioritized questions", () => {
    const qs = buildSellerQuestions(baseVehicle({ fuel: "electric" }), [], []);
    assert.ok(qs.length <= 8);
    assert.ok(qs.length >= 5);
  });
});

describe("Honest market valuation", () => {
  it("Case 7: no listings → sin mercado comparable, no invented median", () => {
    const result = valueVehicle(baseVehicle(), []);
    assert.equal(result.estimatedPrice, null);
    assert.equal(result.insufficientMarketData, true);
    assert.ok(result.segmentReference);
    assert.match(result.verdictLabel, /sin mercado|sin precio/i);
  });

  it("Case 8: 1 listing → very low confidence, no precise market price", () => {
    const listings: VehicleListing[] = [
      {
        id: "1",
        source: "coches.net",
        title: "BMW X1",
        brand: "BMW",
        model: "X1",
        year: 2021,
        mileage: 40000,
        price: 28000,
        fuel: "diesel",
        url: "https://www.coches.net/x",
        fetchedAt: new Date().toISOString(),
        isDemo: false,
        similarity: 0.9,
        dataKind: "dynamic",
      },
    ];
    const result = valueVehicle(baseVehicle(), listings);
    assert.equal(result.estimatedPrice, null);
    assert.ok(result.confidence <= 24);
    assert.equal(result.confidenceBand, "muy_baja");
  });

  it("Case 9: many comparables → real distribution", () => {
    const listings: VehicleListing[] = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      source: "coches.net",
      title: "BMW X1",
      brand: "BMW",
      model: "X1",
      year: 2020 + (i % 3),
      mileage: 40000 + i * 2000,
      price: 25000 + i * 800,
      fuel: "diesel" as const,
      url: `https://www.coches.net/x${i}`,
      fetchedAt: new Date().toISOString(),
      isDemo: false,
      similarity: 0.85,
      dataKind: "dynamic" as const,
      rawData: { matchStrictness: "strict" },
    }));
    const result = valueVehicle(baseVehicle(), listings);
    assert.ok(result.estimatedPrice != null);
    assert.ok(result.distribution.count >= 5);
    assert.ok(result.distribution.p10 != null);
    assert.ok(result.distribution.p90 != null);
    assert.equal(result.origin, "observed");
    assert.ok(result.confidenceBand === "alta" || result.confidenceBand === "media" || result.confidenceBand === "baja");
  });
});

describe("Missing data impact", () => {
  it("Case 10: incomplete data asks for highest-impact fields", () => {
    const report = detectMissingData(
      baseVehicle({
        version: undefined,
        power: undefined,
        transmission: undefined,
        equipment: undefined,
        maintenanceHistory: undefined,
        accidents: undefined,
        owners: undefined,
        itv: undefined,
      }),
    );
    assert.ok(report.items.length > 0);
    assert.ok(report.items[0]!.impactPercent >= report.items[report.items.length - 1]!.impactPercent);
    assert.match(report.headline, /mejorar la valoración/i);
  });
});

describe("RAG isolation", () => {
  it("does not use version to unlock another model chunk", () => {
    const chunk: KnowledgeChunk = {
      id: "bmw-x1-issue",
      type: "issue",
      brands: ["BMW"],
      models: ["X1"],
      title: "Cadena de distribución",
      content: "Problema de cadena en X1",
      source: "test",
      isDemo: true,
    };
    // Ebro with BMW version must NOT match X1 model via version string
    assert.equal(chunkMatchesModel(chunk, "S800", "sDrive18d"), false);
    assert.equal(
      chunkMatchesVehicle(chunk, {
        brand: "Ebro",
        model: "S800",
        version: "sDrive18d",
        year: 2025,
        fuel: "electric",
        mileage: 10000,
      }),
      false,
    );
  });

  it("universal chunks do not become model known issues", () => {
    const chunks: KnowledgeChunk[] = [
      {
        id: "universal-obd",
        type: "issue",
        brands: ["*"],
        title: "Sensores CKP/CMP",
        content: "Códigos genéricos OBD",
        source: "test",
        isDemo: true,
        severity: "medium",
      },
      {
        id: "universal-ev",
        type: "issue",
        brands: ["*"],
        fuels: ["electric"],
        title: "Bomba de calor y SOH",
        content: "Octovalve heat pump HV battery",
        source: "test",
        isDemo: true,
        severity: "high",
      },
    ];
    const reliability = chunksToReliability(
      chunks,
      baseVehicle({ brand: "Ebro", model: "S800", fuel: "electric", version: "Premium" }),
    );
    assert.equal(reliability.available, false);
    assert.equal(reliability.knownIssues.length, 0);
  });

  it("preserves isDemo on model-specific issues", () => {
    const chunks: KnowledgeChunk[] = [
      {
        id: "bmw-issue",
        type: "issue",
        brands: ["BMW"],
        models: ["X1"],
        title: "Bimasa",
        content: "Desgaste bimasa",
        source: "foro",
        isDemo: true,
        severity: "medium",
        reliabilityScore: 70,
      },
    ];
    const reliability = chunksToReliability(chunks, baseVehicle());
    assert.equal(reliability.available, true);
    assert.equal(reliability.isDemo, true);
    assert.ok(reliability.knownIssues.every((i) => i.isDemo === true));
  });
});

describe("Shared component issues (nivel B)", () => {
  const dq200Chunk: KnowledgeChunk = {
    id: "vag-dsg-dq200",
    type: "issue",
    brands: ["volkswagen", "vw", "seat", "skoda", "audi"],
    fuels: ["petrol", "diesel"],
    yearFrom: 2010,
    yearTo: 2018,
    motorCodes: ["DQ200"],
    title: "Caja DSG DQ200 (embrague seco)",
    content: "Tirones y patinaje en urbano.",
    severity: "high",
    source: "foros VAG",
    isDemo: true,
  };

  it("chunkIsPlatformComponent identifies motor-code chunks without models", () => {
    assert.equal(chunkIsPlatformComponent(dq200Chunk), true);
    assert.equal(
      chunkIsPlatformComponent({
        ...dq200Chunk,
        id: "model-specific",
        models: ["golf"],
      }),
      false,
    );
  });

  it("motorCodesMatch links DQ200 across normalized forms", () => {
    assert.equal(motorCodesMatch(["DQ200"], ["dq200"]), true);
    assert.equal(motorCodesMatch(["B47"], ["DQ200"]), false);
  });

  it("Seat Leon with catalog DQ200 gets confirmed shared issue", () => {
    const identity = resolveVehicleIdentity(
      baseVehicle({
        brand: "Seat",
        model: "Leon",
        version: "1.5 TSI",
        fuel: "petrol",
        power: 150,
        year: 2018,
        transmission: "automatic",
        trimSlug: "1-5-tsi",
      }),
    );
    const codes = resolveVehicleComponentCodes(identity.vehicle, {
      identity: identity.evidence,
      trim: identity.trimResolution.trim,
    });
    assert.equal(codes.gearboxCode, "DQ200");
    const summary = chunksToSharedComponents([dq200Chunk], identity.vehicle, codes);
    assert.equal(summary.available, true);
    assert.equal(summary.issues.length, 1);
    assert.equal(summary.issues[0].matchConfidence, "confirmed");
    assert.equal(summary.issues[0].evidenceLevel, "B");
  });

  it("BMW X1 with B47 does not get DQ200 when codes are resolved", () => {
    const vehicle = baseVehicle();
    const codes = resolveVehicleComponentCodes(vehicle, {
      identity: { trimCatalogMatch: true, engineCode: "B47", fields: [], summary: "" },
    });
    const summary = chunksToSharedComponents([dq200Chunk], vehicle, codes);
    assert.equal(summary.issues.length, 0);
  });

  it("VAG without resolved codes may show DQ200 as possible", () => {
    const vehicle = baseVehicle({
      brand: "Seat",
      model: "Leon",
      fuel: "petrol",
      year: 2015,
    });
    const codes = resolveVehicleComponentCodes(vehicle);
    const summary = chunksToSharedComponents([dq200Chunk], vehicle, codes);
    assert.equal(summary.issues.length, 1);
    assert.equal(summary.issues[0].matchConfidence, "possible");
  });

  it("buildSellerQuestions adds medium-priority question for confirmed shared issues", () => {
    const identity = resolveVehicleIdentity(
      baseVehicle({
        brand: "Seat",
        model: "Leon",
        version: "1.5 TSI",
        fuel: "petrol",
        power: 150,
        year: 2018,
        transmission: "automatic",
        trimSlug: "1-5-tsi",
      }),
    );
    const shared = chunksToSharedComponents(
      [dq200Chunk],
      identity.vehicle,
      resolveVehicleComponentCodes(identity.vehicle, {
        identity: identity.evidence,
        trim: identity.trimResolution.trim,
      }),
    ).issues;
    assert.ok(shared.length >= 1);
    const qs = buildSellerQuestions(identity.vehicle, [], [], { sharedComponentIssues: shared });
    assert.ok(qs.some((q) => q.priority === "media" && /DQ200|dsg/i.test(q.question)));
  });
});

describe("Accident negation & listing quality", () => {
  it("does not treat 'sin accidentes' as an accident", () => {
    assert.equal(indicatesAccident("Sin accidentes"), false);
    assert.equal(indicatesAccident("No ha tenido accidentes"), false);
    assert.equal(indicatesAccident("Golpe trasero reparado"), true);
  });

  it("ad quality score is 0–100 and lists missing fields", () => {
    const analysis = analyzeListing(baseVehicle({ accidents: undefined, itv: undefined }), "sin_precio", {
      marketObserved: false,
    });
    assert.ok(analysis.qualityScore >= 0 && analysis.qualityScore <= 100);
    assert.ok(analysis.missingFields.length > 0);
  });
});

describe("URL policy / SSRF", () => {
  it("allows coches.net https listings", () => {
    assert.equal(
      isAllowedCochesNetListingUrl("https://www.coches.net/bmw-x1/detalle/123"),
      true,
    );
  });

  it("allows AutoScout24 https listing URLs", () => {
    assert.equal(
      isAllowedAutoScout24ListingUrl(
        "https://www.autoscout24.es/anuncios/bmw-x1-sdrive-18ia-gasolina-negro-cat_ma13mo19242-0f88b622-d31f-499b-a221-bae5c97673c2",
      ),
      true,
    );
    assert.equal(isAllowedListingUrl("https://www.autoscout24.es/anuncios/test-uuid"), false);
  });

  it("rejects localhost and non-coches hosts", () => {
    assert.equal(isAllowedCochesNetListingUrl("http://127.0.0.1/secret"), false);
    assert.equal(isAllowedCochesNetListingUrl("https://evil.com/coches.net"), false);
    assert.equal(isAllowedCochesNetListingUrl("https://coches.net"), false);
  });
});

describe("Inspection checklist fuel adaptation", () => {
  it("EV checklist includes battery; diesel does not", () => {
    const ev = buildInspectionChecklist(baseVehicle({ fuel: "electric" }));
    const diesel = buildInspectionChecklist(baseVehicle({ fuel: "diesel" }));
    const evText = ev.phases.flatMap((p) => p.items.map((i) => i.item)).join(" ");
    const dieselText = diesel.phases.flatMap((p) => p.items.map((i) => i.item)).join(" ");
    assert.match(evText, /bater|SOH/i);
    assert.doesNotMatch(dieselText, /bater[ií]a HV|SOH/i);
    assert.match(dieselText, /FAP|turbo/i);
  });
});
