import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils/format";
import { formatSignedEuro } from "@/lib/utils/format";
import type { ValuationResult } from "@/types/valuation";
import { cn } from "@/lib/utils";

const VERDICT_STYLES: Record<string, string> = {
  muy_barato: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
  barato: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
  precio_de_mercado: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100",
  caro: "bg-orange-50 text-orange-900 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-100",
  muy_caro: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200",
  sin_precio: "bg-muted text-muted-foreground ring-border",
};

const ORIGIN_LABELS: Record<ValuationResult["origin"], string> = {
  observed: "Basado en anuncios observados",
  ai_estimate: "Referencia orientativa (sin anuncios reales)",
  demo_model: "Sin mercado comparable",
};

function confidenceTone(confidence: number): string {
  if (confidence >= 70) return "text-emerald-700 dark:text-emerald-300";
  if (confidence >= 45) return "text-amber-800 dark:text-amber-200";
  return "text-red-700 dark:text-red-300";
}

export function ValuationCard({ valuation }: { valuation: ValuationResult }) {
  const hasDistribution = valuation.comparableCount >= 5 && valuation.distribution.count >= 5;
  const topLimitations = valuation.limitations.slice(0, 2);
  const hasEstimate = valuation.estimatedPrice != null;

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardDescription>Valoración de precio</CardDescription>
        <CardTitle className="text-2xl sm:text-3xl">
          {hasEstimate ? "Valor estimado" : "Sin mercado comparable"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {hasEstimate ? "Valor estimado" : "Mercado"}
            </p>
            <p className="font-heading text-4xl tracking-tight">
              {hasEstimate ? formatEuro(valuation.estimatedPrice!) : "—"}
            </p>
            <Badge variant="outline" className="mt-2">
              {ORIGIN_LABELS[valuation.origin]}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Precio del anuncio</p>
            <p className="font-heading text-3xl tracking-tight">
              {valuation.advertisedPrice ? formatEuro(valuation.advertisedPrice) : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valoración</p>
            <div
              className={cn(
                "mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium ring-1",
                VERDICT_STYLES[valuation.verdict],
              )}
            >
              <span
                className={cn(
                  "mr-2 mt-1.5 size-2 shrink-0 rounded-full",
                  valuation.verdict === "muy_barato" || valuation.verdict === "barato"
                    ? "bg-emerald-500"
                    : valuation.verdict === "precio_de_mercado"
                      ? "bg-amber-500"
                      : valuation.verdict === "caro"
                        ? "bg-orange-500"
                        : valuation.verdict === "muy_caro"
                          ? "bg-red-500"
                          : "bg-muted-foreground/50",
                )}
                aria-hidden
              />
              {valuation.verdictLabel}
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{valuation.summary}</p>

        {valuation.segmentReference ? (
          <div className="rounded-xl border border-dashed px-4 py-3 text-sm">
            <p className="font-medium">{valuation.segmentReference.label}</p>
            <p className="mt-1 text-muted-foreground">
              {formatEuro(valuation.segmentReference.amount)} — {valuation.segmentReference.disclaimer}
            </p>
          </div>
        ) : null}

        {topLimitations.length > 0 ? (
          <AlertLike items={topLimitations} />
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Intervalo orientativo</p>
            <p className="text-sm font-medium">
              {valuation.low != null && valuation.high != null
                ? `${formatEuro(valuation.low)} – ${formatEuro(valuation.high)}`
                : "No disponible"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Confianza</p>
            <p className={cn("text-sm font-medium", confidenceTone(valuation.confidence))}>
              {valuation.confidenceBand
                ? `${valuation.confidenceBand.replace("_", " ")} · ${valuation.confidence} %`
                : `${valuation.confidence} %`}
            </p>
            {valuation.confidenceDrivers && valuation.confidenceDrivers.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {valuation.confidenceDrivers.map((driver) => (
                  <li key={driver}>· {driver}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">Factores que afectan al precio</h3>
          {valuation.adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay ajustes extra: no se han inventado factores. Añade estado, historial o equipamiento para refinar.
            </p>
          ) : (
            <ul className="space-y-2">
              {valuation.adjustments.map((adjustment) => (
                <li key={adjustment.label} className="flex items-start justify-between gap-4 text-sm">
                  <span>
                    <span className="font-medium">{adjustment.label}</span>
                    <span className="block text-muted-foreground">{adjustment.reason}</span>
                  </span>
                  <span className={adjustment.amount >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {formatSignedEuro(adjustment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasDistribution ? (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-7">
            <Stat label="Mínimo" value={formatEuro(valuation.distribution.min)} />
            {valuation.distribution.p10 != null ? (
              <Stat label="P10" value={formatEuro(valuation.distribution.p10)} />
            ) : null}
            <Stat label="P25" value={formatEuro(valuation.distribution.p25)} />
            <Stat label="Mediana" value={formatEuro(valuation.distribution.median)} />
            <Stat label="P75" value={formatEuro(valuation.distribution.p75)} />
            {valuation.distribution.p90 != null ? (
              <Stat label="P90" value={formatEuro(valuation.distribution.p90)} />
            ) : null}
            <Stat label="Máximo" value={formatEuro(valuation.distribution.max)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {valuation.origin === "observed"
              ? "Pocos anuncios para mostrar percentiles fiables; el intervalo se ha ensanchado a propósito."
              : "No hay percentiles de mercado: sin anuncios observados no se simula una distribución de precios."}
          </p>
        )}
        {valuation.percentDifference != null && valuation.origin === "observed" ? (
          <p className="text-xs text-muted-foreground">
            Desviación frente a la estimación: {formatPercent(valuation.percentDifference)}
          </p>
        ) : null}

        <Accordion type="single" collapsible>
          <AccordionItem value="method">
            <AccordionTrigger>Metodología</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {valuation.methodology.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function AlertLike({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
      <p className="font-medium">Antes de fiarte del número</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-amber-950/80 dark:text-amber-50/80">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
