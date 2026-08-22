/**
 * Smoke test de persistencia de análisis (file backend).
 * Uso: npx tsx scripts/smoke-analysis-store.ts
 */
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { AnalyzeResponse } from "../types/valuation";

async function main() {
  const dir = join(process.cwd(), ".data", "analyses-smoke");
  process.env.ANALYSIS_STORE = "file";
  process.env.ANALYSIS_STORE_DIR = dir;
  process.env.ANALYSIS_TTL_SECONDS = "3600";
  process.env.VERCEL = "";

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  // Dynamic import after env is set
  const { saveAnalysis, getAnalysis, resolveAnalysisStoreBackend } = await import(
    "../lib/store/vehicle-store"
  );

  if (resolveAnalysisStoreBackend() !== "file") {
    throw new Error(`Expected file backend, got ${resolveAnalysisStoreBackend()}`);
  }

  const sample = {
    id: "smoke-analysis-001",
    generatedAt: new Date().toISOString(),
    dataMode: "knowledge",
    vehicle: {
      id: "smoke-analysis-001",
      brand: "Seat",
      model: "Leon",
      year: 2018,
      mileage: 90000,
      fuel: "diesel",
      transmission: "manual",
    },
    valuation: {
      estimatedPrice: 12000,
      low: 10000,
      high: 14000,
      verdict: "precio_de_mercado",
      verdictLabel: "Precio de mercado",
      summary: "smoke",
      confidence: 40,
      distribution: { count: 0, min: 0, p25: 0, median: 0, p75: 0, max: 0 },
      adjustments: [],
      comparableCount: 0,
      sourceCount: 0,
      dataUpdatedAt: new Date().toISOString(),
      origin: "demo_model",
      methodology: [],
      limitations: [],
    },
    scores: {
      dimensions: [],
      overall: null,
      overallLabel: null,
      summary: "smoke",
    },
    comparables: [],
    alternatives: [],
    sources: [],
    listingAnalysis: {
      available: false,
      price: "",
      vehicle: "",
      description: "",
      equipment: "",
      photos: "",
      redFlags: [],
      askSeller: [],
    },
    sellerQuestions: [],
    reliability: {
      available: false,
      score: null,
      notes: [],
      knownIssues: [],
      isDemo: true,
      source: "smoke",
    },
    maintenance: {
      available: false,
      notes: [],
      upcoming: [],
      isDemo: true,
      source: "smoke",
    },
    limitations: [],
  } as unknown as AnalyzeResponse;

  await saveAnalysis(sample);
  const loaded = await getAnalysis(sample.id);
  if (!loaded || loaded.id !== sample.id) {
    throw new Error("Failed to load saved analysis from file store");
  }

  await rm(dir, { recursive: true, force: true });
  console.log("PASS analysis store file backend smoke");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
