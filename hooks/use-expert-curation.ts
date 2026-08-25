"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExpertAnalysisPatch } from "@/lib/expert-mode/patch-analysis";
import { applyExpertPatch } from "@/lib/expert-mode/patch-analysis";
import { readExpertModeEnabled, writeExpertModeEnabled } from "@/lib/expert-mode/storage";
import type { AnalyzeResponse } from "@/types/valuation";

export function useExpertCuration(analysis: AnalyzeResponse | null) {
  const [expertMode, setExpertModeState] = useState(false);
  const [curated, setCurated] = useState<AnalyzeResponse | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setExpertModeState(readExpertModeEnabled());
  }, []);

  useEffect(() => {
    if (analysis) {
      setCurated(structuredClone(analysis));
      setHasChanges(false);
      setSaveStatus("idle");
    } else {
      setCurated(null);
      setHasChanges(false);
    }
  }, [analysis?.id, analysis?.generatedAt]);

  function setExpertMode(enabled: boolean) {
    setExpertModeState(enabled);
    writeExpertModeEnabled(enabled);
    if (!enabled && analysis) {
      setCurated(structuredClone(analysis));
      setHasChanges(false);
    }
  }

  const applyPatch = useCallback((patch: ExpertAnalysisPatch) => {
    setCurated((current) => {
      if (!current) return current;
      setHasChanges(true);
      setSaveStatus("idle");
      return applyExpertPatch(current, patch);
    });
  }, []);

  function resetCurated() {
    if (analysis) {
      setCurated(structuredClone(analysis));
      setHasChanges(false);
      setSaveStatus("idle");
    }
  }

  async function saveCurated(): Promise<AnalyzeResponse | null> {
    if (!curated) return null;
    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/vehicle/${encodeURIComponent(curated.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(curated),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "No se pudo guardar la curación.");
      }
      const saved = (await response.json()) as AnalyzeResponse;
      setCurated(saved);
      setHasChanges(false);
      setSaveStatus("saved");
      return saved;
    } catch {
      setSaveStatus("error");
      return null;
    }
  }

  function exportCuratedJson() {
    if (!curated) return;
    const blob = new Blob([JSON.stringify(curated, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `carquestions-curated-${curated.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const displayAnalysis =
    expertMode && curated ? curated : analysis;

  return {
    expertMode,
    setExpertMode,
    displayAnalysis,
    curated,
    hasChanges,
    saveStatus,
    applyPatch,
    resetCurated,
    saveCurated,
    exportCuratedJson,
  };
}
