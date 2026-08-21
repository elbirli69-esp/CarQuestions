import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils/format";
import { formatSignedEuro } from "@/lib/utils/format";
import type { ValuationResult } from "@/types/valuation";
import { cn } from "@/lib/utils";

const VERDICT_STYLES: Record<string, string> = {
  muy_barato: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  barato: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  precio_de_mercado: "bg-amber-50 text-amber-900 ring-amber-200",
  caro: "bg-orange-50 text-orange-900 ring-orange-200",
  muy_caro: "bg-red-50 text-red-800 ring-red-200",
  sin_precio: "bg-muted text-muted-foreground ring-border",
};

const VERDICT_DOT: Record<string, string> = {
  muy_barato: "🟢",
  barato: "🟢",
  precio_de_mercado: "🟡",
  caro: "🟠",
  muy_caro: "🔴",
  sin_precio: "⚪",
};

export function ValuationCard({ valuation }: { valuation: ValuationResult }) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardDescription>Valoración</CardDescription>
        <CardTitle className="text-2xl sm:text-3xl">Valor estimado</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Valor estimado</p>
            <p className="font-heading text-4xl tracking-tight">{formatEuro(valuation.estimatedPrice)}</p>
            <Badge variant="outline" className="mt-2">
              Modelo de demostración
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
              {VERDICT_DOT[valuation.verdict]} {valuation.verdictLabel}
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{valuation.summary}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Valor de mercado</p>
            <p className="text-sm font-medium">
              {formatEuro(valuation.low)} – {formatEuro(valuation.high)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Confianza</p>
            <p className="text-sm font-medium">{valuation.confidence} %</p>
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

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Stat label="Mínimo" value={formatEuro(valuation.distribution.min)} />
          <Stat label="P25" value={formatEuro(valuation.distribution.p25)} />
          <Stat label="Mediana" value={formatEuro(valuation.distribution.median)} />
          <Stat label="P75" value={formatEuro(valuation.distribution.p75)} />
          <Stat label="Máximo" value={formatEuro(valuation.distribution.max)} />
        </div>
        {valuation.percentDifference != null ? (
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
