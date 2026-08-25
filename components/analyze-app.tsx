"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { DemoBanner } from "@/components/demo-banner";
import { ExpertCurationBar } from "@/components/expert/expert-curation-bar";
import { ExpertModeToggle } from "@/components/expert/expert-mode-toggle";
import { HelpGuide } from "@/components/help/help-guide";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnalysisProgressCard } from "@/components/valuation/analysis-progress-card";
import { AnalysisResultsTabs } from "@/components/valuation/analysis-results-tabs";
import { ConsistencyAlert } from "@/components/valuation/consistency-alert";
import { VehicleForm } from "@/components/vehicle-form/vehicle-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useExpertCuration } from "@/hooks/use-expert-curation";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";

export function AnalyzeApp({ initialAnalysis = null }: { initialAnalysis?: AnalyzeResponse | null }) {
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [evaluatingVehicle, setEvaluatingVehicle] = useState<VehicleInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useExpertCuration(analysis);

  async function handleSubmit(vehicle: VehicleInput) {
    setError(null);
    setEvaluatingVehicle(vehicle);
    setLoading(true);
    setAnalysis(null);
    requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    try {
      const response = await fetch("/api/vehicle/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicle),
      });
      const payload = (await response.json()) as AnalyzeResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se ha podido analizar el vehículo.");
      }
      setAnalysis(payload);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido analizar el vehículo.");
    } finally {
      setLoading(false);
      setEvaluatingVehicle(null);
    }
  }

  async function handleSaveCurated() {
    const saved = await saveCurated();
    if (saved) setAnalysis(saved);
  }

  const evaluatingLabel = evaluatingVehicle
    ? [evaluatingVehicle.brand, evaluatingVehicle.model, evaluatingVehicle.version]
        .filter(Boolean)
        .join(" ")
    : undefined;

  const view = displayAnalysis ?? analysis;
  const hasMarketData = view ? view.valuation.comparableCount > 0 : false;
  const hasAlternatives = view ? view.alternatives.length > 0 : false;
  const identityBroken = view?.consistency?.status === "invalid";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon-512.png"
              alt="CarQuestions"
              width={36}
              height={36}
              className="size-9 rounded-[9px] shadow-sm"
              priority
            />
            <p className="text-sm font-medium tracking-wide text-muted-foreground">CarQuestions</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ExpertModeToggle enabled={expertMode} onChange={setExpertMode} />
            <HelpGuide />
            <ThemeToggle />
          </div>
        </div>
        <h1 className="font-heading max-w-xl text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
          CarQuestions
        </h1>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          Copiloto para comprar de segunda mano: cuánto pagar, qué riesgo tiene, qué preguntar y qué
          comprobar antes de decidir.
        </p>
      </header>

      {view ? <DemoBanner dataMode={view.dataMode} /> : null}

      <VehicleForm onSubmit={handleSubmit} isSubmitting={loading} />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se ha podido completar el análisis</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div ref={progressRef}>
          <AnalysisProgressCard
            active={loading}
            vehicleLabel={evaluatingLabel}
            hasListingUrl={Boolean(evaluatingVehicle?.listingUrl)}
          />
        </div>
      ) : null}

      {view ? (
        <div ref={resultsRef} className="flex flex-col gap-6">
          {view.expertCurated ? (
            <Badge variant="secondary" className="w-fit">Análisis curado por experto</Badge>
          ) : null}
          {expertMode ? (
            <ExpertCurationBar
              hasChanges={hasChanges}
              saveStatus={saveStatus}
              onSave={() => void handleSaveCurated()}
              onReset={resetCurated}
              onExport={exportCuratedJson}
            />
          ) : null}
          {view.consistency ? (
            <ConsistencyAlert
              report={view.consistency}
              expertMode={expertMode}
              onSummaryChange={(value) => applyPatch({ type: "consistencySummary", value })}
              onIssueChange={(index, message) => applyPatch({ type: "consistencyIssue", index, message })}
            />
          ) : null}
          <AnalysisResultsTabs
            analysis={view}
            identityBroken={identityBroken}
            hasMarketData={hasMarketData}
            hasAlternatives={hasAlternatives}
            pendingQuestion={pendingQuestion}
            onQuestionChange={setPendingQuestion}
            expertMode={expertMode}
            onCurate={applyPatch}
          />
        </div>
      ) : null}
    </div>
  );
}
