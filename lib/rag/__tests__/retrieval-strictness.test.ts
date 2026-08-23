import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookupKnowledge } from "@/lib/vehicles/knowledge-base";
import { retrieveKnowledgeForVehicle } from "@/lib/rag/retrieval";
import { classifyChunkEvidence } from "@/lib/rag/evidence";
import type { Vehicle } from "@/types/vehicle";

const CONTAMINATION = /ckp|cmp|p0118|octovalve|brake-by-wire|bomba de calor|heat pump|soh|bater[ií]a hv/i;

function vehicle(partial: Partial<Vehicle> & Pick<Vehicle, "brand" | "model" | "fuel">): Vehicle {
  return {
    year: 2024,
    mileage: 12000,
    ...partial,
  };
}

describe("RAG estricto", () => {
  it("no atribuye sensores ICE genéricos al Ebro S800", () => {
    const ebro = vehicle({ brand: "Ebro", model: "S800", fuel: "electric", power: 220, year: 2026 });
    const knowledge = lookupKnowledge(ebro);
    const haystack = [
      ...knowledge.reliability.knownIssues.map((issue) => `${issue.title} ${issue.detail}`),
      ...knowledge.reliability.notes,
    ].join(" ");
    assert.equal(knowledge.reliability.available, false);
    assert.equal(knowledge.reliability.insufficientEvidence, true);
    assert.doesNotMatch(haystack, /ckp|cmp|p0118|octovalve/i);
    assert.match(knowledge.reliability.notes.join(" "), /evidencia suficiente/i);
  });

  it("no recupera chunks universales como específicos del Ebro", () => {
    const ebro = vehicle({ brand: "Ebro", model: "S800", fuel: "electric", year: 2026 });
    const chunks = retrieveKnowledgeForVehicle(ebro, 20);
    for (const chunk of chunks) {
      const level = classifyChunkEvidence(chunk, ebro);
      assert.ok(level === "A" || level === "B", `${chunk.id} llegó como ${level}`);
      assert.doesNotMatch(`${chunk.title} ${chunk.content}`, /ckp|cmp/i);
    }
  });

  it("BMW X1 diésel puede tener evidencia de marca/modelo, no de EV", () => {
    const x1 = vehicle({
      brand: "BMW",
      model: "X1",
      version: "sDrive18d",
      fuel: "diesel",
      year: 2019,
      mileage: 80000,
      power: 150,
    });
    const knowledge = lookupKnowledge(x1);
    const text = knowledge.reliability.knownIssues.map((issue) => `${issue.title} ${issue.detail}`).join(" ");
    assert.doesNotMatch(text, /octovalve|heat pump|bomba de calor/i);
    if (knowledge.reliability.available) {
      assert.ok(knowledge.reliability.knownIssues.every((issue) => issue.evidenceLevel === "A" || issue.evidenceLevel === "B"));
      assert.doesNotMatch(text, /xdrive|caja de transferencia/i);
    }
  });

  it("bloquedado por identidad no genera ficha técnica", () => {
    const bad = vehicle({
      brand: "Ebro",
      model: "S800",
      version: "sDrive18d",
      fuel: "electric",
    });
    const knowledge = lookupKnowledge(bad, { blocked: true, reason: "incoherente" });
    assert.equal(knowledge.reliability.available, false);
    assert.equal(knowledge.knowledgeChunks.length, 0);
    assert.doesNotMatch(knowledge.reliability.knownIssues.map((i) => i.title).join(" "), CONTAMINATION);
  });
});
