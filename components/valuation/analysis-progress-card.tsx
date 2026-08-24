"use client";

import { useEffect, useState } from "react";
import { CheckIcon, LoaderCircleIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ANALYSIS_STEPS = [
  "Validando datos del vehículo",
  "Verificando coherencia marca, modelo y versión",
  "Buscando anuncios comparables (coches.net, AutoScout24)",
  "Calculando valor de mercado",
  "Consultando fiabilidad y problemas conocidos",
  "Preparando preguntas y checklist de compra",
] as const;

const STEP_INTERVAL_MS = 2200;

export function AnalysisProgressCard({
  active,
  vehicleLabel,
  hasListingUrl,
}: {
  active: boolean;
  vehicleLabel?: string;
  hasListingUrl?: boolean;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, ANALYSIS_STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  const steps = hasListingUrl
    ? [
        "Validando datos del vehículo",
        "Leyendo ficha del anuncio",
        ...ANALYSIS_STEPS.slice(1),
      ]
    : [...ANALYSIS_STEPS];

  const currentIndex = Math.min(stepIndex, steps.length - 1);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <Card className="border-primary/20 bg-card shadow-sm" aria-live="polite" aria-busy="true">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LoaderCircleIcon className="size-5 animate-spin text-primary" aria-hidden />
          Analizando el coche
        </CardTitle>
        <CardDescription>
          {vehicleLabel
            ? `Evaluando ${vehicleLabel}. Suele tardar entre 10 y 30 segundos.`
            : "Evaluando el vehículo. Suele tardar entre 10 y 30 segundos."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del análisis"
          />
        </div>
        <ol className="space-y-2 text-sm">
          {steps.map((label, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-start gap-2",
                  done && "text-muted-foreground",
                  current && "font-medium text-foreground",
                  !done && !current && "text-muted-foreground/60",
                )}
              >
                {done ? (
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                ) : current ? (
                  <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
                ) : (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
                )}
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          No cerramos la página. Si un portal bloquea el scrape, seguimos con los datos del formulario.
        </p>
      </CardContent>
    </Card>
  );
}
