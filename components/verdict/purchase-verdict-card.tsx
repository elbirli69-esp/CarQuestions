import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils/format";
import { labelForBand } from "@/lib/valuation/confidence";
import { cn } from "@/lib/utils";
import type { AnalyzeResponse } from "@/types/valuation";

const TONE: Record<string, string> = {
  good: "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100",
  ok: "bg-amber-50 text-amber-950 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100",
  caution: "bg-orange-50 text-orange-950 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-100",
  bad: "bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-100",
};

const DOT: Record<string, string> = {
  good: "bg-emerald-500",
  ok: "bg-amber-500",
  caution: "bg-orange-500",
  bad: "bg-red-500",
};

export function PurchaseVerdictCard({ analysis }: { analysis: AnalyzeResponse }) {
  const verdict = analysis.purchaseVerdict;
  const valuation = analysis.valuation;
  const tone = verdict?.tone ?? "caution";
  const band = valuation.confidenceBand;
  const hasMarket = valuation.origin === "observed" && valuation.marketStatus === "observed";
  const advertised = valuation.advertisedPrice;

  return (
    <Card className="bg-card">
      <CardHeader className="gap-2">
        <CardDescription>¿Es una buena compra?</CardDescription>
        <CardTitle className="text-2xl sm:text-3xl">
          <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-base font-medium ring-1 sm:text-lg", TONE[tone])}>
            <span className={cn("size-2.5 rounded-full", DOT[tone])} aria-hidden />
            {verdict?.label ?? "Compraría con precaución"}
          </span>
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{verdict?.summary ?? valuation.summary}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Precio" value={advertised != null ? formatEuro(advertised) : "—"} />
        <Stat
          label="Mercado"
          value={
            hasMarket
              ? `${formatEuro(valuation.low)}–${formatEuro(valuation.high)}`
              : "Sin mercado comparable"
          }
        />
        <Stat
          label="Diferencia"
          value={
            hasMarket && valuation.percentDifference != null
              ? formatPercent(valuation.percentDifference)
              : "—"
          }
        />
        <div className="rounded-xl bg-muted/60 px-3 py-3">
          <p className="text-xs text-muted-foreground">Confianza</p>
          <p className="font-heading text-lg font-medium">{band ? labelForBand(band) : `${valuation.confidence} %`}</p>
          {band ? (
            <Badge variant="outline" className="mt-1 text-[10px]">
              {valuation.confidence} %
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-medium leading-tight">{value}</p>
    </div>
  );
}
