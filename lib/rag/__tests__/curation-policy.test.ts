import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowsNonDemo,
  suggestVerificationLevel,
  validateChunkCuration,
} from "@/lib/rag/curation/policy";
import { loadKnowledgeChunks } from "@/lib/rag/knowledge/load";
import type { KnowledgeChunk } from "@/types/knowledge";

function baseChunk(overrides: Partial<KnowledgeChunk>): KnowledgeChunk {
  return {
    id: "test-chunk",
    type: "issue",
    brands: ["volkswagen"],
    title: "Test",
    content: "Test content",
    source: "Test source",
    isDemo: true,
    ...overrides,
  };
}

describe("curation policy", () => {
  it("rejects isDemo=false without curatedAt and verificationLevel", () => {
    const errors = validateChunkCuration(baseChunk({ isDemo: false }));
    assert.ok(errors.length >= 2);
  });

  it("accepts safety_gate_portal with portal URL", () => {
    const errors = validateChunkCuration(
      baseChunk({
        isDemo: false,
        curatedAt: "2026-08-25T10:00:00.000Z",
        verificationLevel: "safety_gate_portal",
        externalRef: "Safety Gate search",
        sourceUrl: "https://ec.europa.eu/safety-gate",
      }),
    );
    assert.equal(errors.length, 0);
  });

  it("rejects bare forum homepage as sourceUrl for curated chunk", () => {
    const errors = validateChunkCuration(
      baseChunk({
        isDemo: false,
        curatedAt: "2026-08-25T10:00:00.000Z",
        verificationLevel: "technical_literature",
        sourceUrl: "https://www.bmwfaq.org/",
      }),
    );
    assert.ok(errors.some((e) => e.message.includes("foro")));
  });

  it("suggestVerificationLevel detects Safety Gate", () => {
    const level = suggestVerificationLevel(
      baseChunk({ sourceUrl: "https://ec.europa.eu/safety-gate" }),
    );
    assert.equal(level, "safety_gate_portal");
  });

  it("loaded corpus passes curation validation", () => {
    const chunks = loadKnowledgeChunks();
    const curated = chunks.filter((c) => !c.isDemo);
    assert.ok(curated.length >= 25, `expected curated batch, got ${curated.length}`);
    for (const chunk of curated) {
      const errors = validateChunkCuration(chunk);
      assert.equal(errors.length, 0, `${chunk.id}: ${errors.map((e) => e.message).join(", ")}`);
    }
  });

  it("allowsNonDemo covers official verification levels", () => {
    assert.equal(allowsNonDemo("safety_gate_alert"), true);
    assert.equal(allowsNonDemo("oem_recall"), true);
  });
});
