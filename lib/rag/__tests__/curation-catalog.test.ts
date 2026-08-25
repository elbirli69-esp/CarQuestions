import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalogCurationOverlay } from "@/lib/rag/curation/catalog";
import type { KnowledgeChunk } from "@/types/knowledge";

describe("curation catalog", () => {
  it("curates universal inspection with DGT regulatory source", () => {
    const chunk: KnowledgeChunk = {
      id: "test-universal-inspection",
      type: "inspection",
      brands: ["*"],
      title: "Checklist ITV",
      content: "Test",
      source: "Test",
      isDemo: true,
    };
    const overlay = buildCatalogCurationOverlay(chunk);
    assert.ok(overlay);
    assert.equal(overlay.isDemo, false);
    assert.equal(overlay.verificationLevel, "regulatory");
    assert.ok(overlay.sourceUrl?.includes("dgt.es"));
  });

  it("curates brand maintenance with OEM service URL", () => {
    const chunk: KnowledgeChunk = {
      id: "test-bmw-maint",
      type: "maintenance",
      brands: ["bmw"],
      title: "BMW service",
      content: "Test",
      source: "Test",
      isDemo: true,
    };
    const overlay = buildCatalogCurationOverlay(chunk);
    assert.ok(overlay);
    assert.equal(overlay.verificationLevel, "oem_manual");
    assert.ok(overlay.sourceUrl?.includes("bmw.es"));
  });
});
