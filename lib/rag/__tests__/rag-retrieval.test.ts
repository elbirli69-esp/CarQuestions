import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetKnowledgeCache } from "@/lib/rag/knowledge/load";
import { buildVehicleKnowledgeQuery } from "@/lib/rag/knowledge/retrieval-query";
import {
  RAG_ADVERSARIAL_CASES,
  RAG_POSITIVE_CASES,
  matchesRagExpectation,
  matchesRagExclusion,
} from "@/lib/rag/eval/cases";
import { getKnowledgeVectorStore } from "@/lib/rag/vector/store";
import { retrieveKnowledgeForVehicle } from "@/lib/rag/retrieval";
import type { Vehicle } from "@/types/vehicle";

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
    engineCode: "B47",
    advertisedPrice: 28900,
    ...overrides,
  };
}

describe("RAG retrieval improvements", () => {
  it("buildVehicleKnowledgeQuery includes motor and gearbox codes", () => {
    const query = buildVehicleKnowledgeQuery(
      baseVehicle({ engineCode: "B47", gearboxCode: "DQ200" }),
      {
        componentCodes: {
          engineCode: "B47",
          gearboxCode: "DQ200",
          codes: ["B47", "DQ200"],
          catalogResolved: true,
          textInferred: false,
        },
      },
    );
    assert.match(query.text.toLowerCase(), /b47/);
    assert.match(query.text.toLowerCase(), /dq200/);
    assert.equal(query.vehicle?.engineCode, "B47");
    assert.equal(query.vehicle?.gearboxCode, "DQ200");
  });

  it("retrieveKnowledgeForVehicle with B47 does not rank DQ200 in top 5", () => {
    resetKnowledgeCache();
    const chunks = retrieveKnowledgeForVehicle(baseVehicle(), 12, {
      engineCode: "B47",
      gearboxCode: undefined,
      codes: ["B47"],
      catalogResolved: true,
      textInferred: false,
    });
    const topIds = chunks.slice(0, 5).map((c) => c.id);
    assert.ok(!topIds.some((id) => id.toLowerCase().includes("dq200")));
  });

  it("positive eval cases hit expected topics in top-8", () => {
    resetKnowledgeCache();
    const store = getKnowledgeVectorStore();
    let passed = 0;
    for (const testCase of RAG_POSITIVE_CASES) {
      const hits = store.query({
        text: testCase.text,
        vehicle: testCase.vehicle,
        limit: 8,
      });
      const ids = hits.map((hit) => hit.document.id.replace(/^knowledge_/, ""));
      const ok = ids.some((id) => matchesRagExpectation(id, testCase.expectIdIncludes ?? []));
      if (ok) passed += 1;
    }
    assert.ok(passed >= RAG_POSITIVE_CASES.length - 1, `positive cases: ${passed}/${RAG_POSITIVE_CASES.length}`);
  });

  it("adversarial eval cases respect exclusions", () => {
    resetKnowledgeCache();
    const store = getKnowledgeVectorStore();
    for (const testCase of RAG_ADVERSARIAL_CASES) {
      const hits = store.query({
        text: testCase.text,
        vehicle: testCase.vehicle,
        limit: 8,
      });
      const ids = hits.map((hit) => hit.document.id.replace(/^knowledge_/, ""));

      if (testCase.expectIdIncludes?.length) {
        assert.ok(
          ids.some((id) => matchesRagExpectation(id, testCase.expectIdIncludes!)),
          `${testCase.name}: expected include in ${ids.slice(0, 4).join(", ")}`,
        );
      }

      if (testCase.expectIdExcludes) {
        const leaked = ids.filter((id) => matchesRagExclusion(id, testCase.expectIdExcludes!));
        assert.equal(
          leaked.length,
          0,
          `${testCase.name}: excluded ${testCase.expectIdExcludes!.join("|")} found in ${leaked.join(", ")}`,
        );
      }
    }
  });
});
