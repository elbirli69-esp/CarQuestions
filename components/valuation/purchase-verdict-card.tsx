import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { PurchaseVerdict } from "@/lib/vehicles/purchase-verdict";
import type { ValuationResult } from "@/types/valuation";

const TONE: Record<PurchaseVerdict["tone"], string> = {
  green: "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100",
  amber: "bg-amber-50 text-amber-950 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-50",
  orange: "bg-orange-50 text-orange-950 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-50",
  red: "bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-100",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const DOT: Record<PurchaseVerdict["tone"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  neutral: "bg-muted-foreground/50",
};

export function PurchaseVerdictCard({
  verdict,
  valuation,
}: {
  verdict: PurchaseVerdict;
  valuation: ValuationResult;
}) {
  return (
    <Card className="bg-card">
      <CardHeader className="gap-3">
        <CardDescription>¿Es una buena compra?</CardDescription>
        <CardTitle className="font-heading text-2xl sm:text-3xl">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-base font-medium ring-1 sm:text-lg",
              TONE[verdict.tone],
            )}
          >
            <span className={cn("size-2.5 shrink-0 rounded-full", DOT[verdict.tone])} aria-hidden />
            {verdict.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-6 text-muted-foreground">{verdict.summary}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Precio" value={verdict.priceLine ?? "—"} />
          <Metric label="Mercado" value={verdict.marketLine ?? "—"} />
          <Metric label="Diferencia" value={verdict.deltaLine ?? "—"} />
          <Metric
            label="Confianza"
            value={`${verdict.confidenceLabel} (${verdict.confidencePercent} %)`}
          />
        </div>
        {valuation.segmentReference ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm">
            <p className="font-medium">{valuation.segmentReference.label}</p>
            <p className="mt-1 text-muted-foreground">
              {formatEuro(valuation.segmentReference.amount)} — {valuation.segmentReference.disclaimer}
            </p>
          </div>
        ) : null}
        {valuation.percentDifference != null && valuation.origin === "observed" ? (
          <p className="text-xs text-muted-foreground">
            Desviación frente a estimación: {formatPercent(valuation.percentDifference)}
          </p>
        ) : null}
        {valuation.confidenceBand ? (
          <Badge variant="outline" className="w-fit">
            Banda de confianza: {valuation.confidenceBand.replace("_", " ")}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium leading-snug">{value}</p>
    </div>
  );
}
