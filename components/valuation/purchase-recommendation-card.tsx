import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils/format";
import { CONFIDENCE_TIER_LABELS } from "@/types/vehicle-validation";
import type { PurchaseRecommendation, ValuationResult } from "@/types/valuation";
import { cn } from "@/lib/utils";

const VERDICT_STYLES: Record<string, string> = {
  good_opportunity: "border-emerald-500/30 bg-emerald-500/10",
  fair_price: "border-amber-500/30 bg-amber-500/10",
  caution: "border-orange-500/30 bg-orange-500/10",
  do_not_buy: "border-red-500/30 bg-red-500/10",
  insufficient_data: "border-border bg-muted/40",
};

export function PurchaseRecommendationCard({
  recommendation,
  valuation,
}: {
  recommendation: PurchaseRecommendation;
  valuation: ValuationResult;
}) {
  return (
    <Card className={cn("border-2", VERDICT_STYLES[recommendation.verdict])}>
      <CardHeader>
        <CardDescription>¿Es una buena compra?</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl">
          <span aria-hidden>{recommendation.emoji}</span>
          {recommendation.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-6 text-muted-foreground">{recommendation.summary}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Precio anunciado</p>
            <p className="font-heading text-2xl tracking-tight">
              {valuation.advertisedPrice ? formatEuro(valuation.advertisedPrice) : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Mercado estimado</p>
            <p className="text-sm font-medium">
              {formatEuro(valuation.low)} – {formatEuro(valuation.high)}
            </p>
          </div>
          <div className="rounded-xl bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Confianza</p>
            <p className="text-sm font-medium">
              {valuation.confidenceTier
                ? CONFIDENCE_TIER_LABELS[valuation.confidenceTier]
                : `${valuation.confidence} %`}
            </p>
            {valuation.percentDifference != null && valuation.origin === "observed" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Diferencia {formatPercent(valuation.percentDifference)}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
