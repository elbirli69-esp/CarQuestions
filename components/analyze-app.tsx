"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  BadgeEuroIcon,
  ClipboardCheckIcon,
  MessageCircleQuestionIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { ExpertCurationBar } from "@/components/expert/expert-curation-bar";
import { AppHeaderToolbar } from "@/components/layout/app-header-toolbar";
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

  const heroFeatures = [
    { icon: BadgeEuroIcon, label: "Precio de mercado" },
    { icon: ShieldAlertIcon, label: "Riesgos conocidos" },
    { icon: MessageCircleQuestionIcon, label: "Preguntas al vendedor" },
    { icon: ClipboardCheckIcon, label: "Checklist de compra" },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/icon-512.png"
              alt="CarQuestions"
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-[10px] shadow-md ring-1 ring-border/50"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-wide text-muted-foreground">CarQuestions</p>
              <p className="truncate text-xs text-muted-foreground/80">Segunda mano en España</p>
            </div>
          </div>
          <AppHeaderToolbar expertMode={expertMode} onExpertModeChange={setExpertMode} />
        </div>
        <div className="max-w-xl space-y-4">
          <h1 className="font-heading text-3xl leading-[1.15] font-medium tracking-tight sm:text-4xl">
            ¿Cuánto vale realmente{" "}
            <span className="text-foreground/75">este coche?</span>
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Copiloto para comprar con datos: tasación orientativa, fallos frecuentes del modelo,
            preguntas al vendedor y qué revisar antes de pagar.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Qué obtienes">
            {heroFeatures.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm"
                >
                  <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
