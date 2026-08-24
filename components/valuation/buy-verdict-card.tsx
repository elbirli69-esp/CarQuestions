import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONFIDENCE_LABELS } from "@/lib/valuation/confidence";
import type { BuyVerdict } from "@/types/analysis";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-50",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-950 dark:text-orange-50",
  red: "border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-50",
  neutral: "border-border bg-muted/40",
};

const DOT_STYLES = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  neutral: "bg-muted-foreground/50",
};

export function BuyVerdictCard({ verdict }: { verdict: BuyVerdict }) {
  return (
    <Card className={cn("border-2", TONE_STYLES[verdict.tone])}>
      <CardHeader>
        <CardDescription>¿Es una buena compra?</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl">
          <span
            className={cn("size-3 shrink-0 rounded-full", DOT_STYLES[verdict.tone])}
            aria-hidden
          />
          {verdict.headline}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 opacity-90">{verdict.detail}</p>
        {verdict.reasons.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {verdict.reasons.map((reason) => (
              <li
                key={reason.text}
                className={cn(
                  reason.tone === "positive" && "text-emerald-800 dark:text-emerald-200",
                  reason.tone === "negative" && "text-red-800 dark:text-red-200",
                  reason.tone === "neutral" && "opacity-80",
                )}
              >
                · {reason.text}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs opacity-70">
          Confianza del veredicto: {CONFIDENCE_LABELS[verdict.confidence]}
        </p>
      </CardContent>
    </Card>
  );
}
