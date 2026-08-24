"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { DemoBanner } from "@/components/demo-banner";
import { HelpGuide } from "@/components/help/help-guide";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnalysisResultsTabs } from "@/components/valuation/analysis-results-tabs";
import { ConsistencyAlert } from "@/components/valuation/consistency-alert";
import { VehicleForm } from "@/components/vehicle-form/vehicle-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleInput } from "@/types/vehicle";

export function AnalyzeApp({ initialAnalysis = null }: { initialAnalysis?: AnalyzeResponse | null }) {
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(vehicle: VehicleInput) {
    setError(null);
    setLoading(true);
    setAnalysis(null);
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
    }
  }

  const hasMarketData = analysis ? analysis.valuation.comparableCount > 0 : false;
  const hasAlternatives = analysis ? analysis.alternatives.length > 0 : false;
  const identityBroken = analysis?.consistency?.status === "invalid";

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
          <div className="flex items-center gap-2">
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

      {analysis ? <DemoBanner dataMode={analysis.dataMode} /> : null}

      <VehicleForm onSubmit={handleSubmit} isSubmitting={loading} />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se ha podido completar el análisis</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : null}

      {analysis ? (
        <div ref={resultsRef} className="flex flex-col gap-6">
          {analysis.consistency ? <ConsistencyAlert report={analysis.consistency} /> : null}
          <AnalysisResultsTabs
            analysis={analysis}
            identityBroken={identityBroken}
            hasMarketData={hasMarketData}
            hasAlternatives={hasAlternatives}
            pendingQuestion={pendingQuestion}
            onQuestionChange={setPendingQuestion}
          />
        </div>
      ) : null}
    </div>
  );
}
