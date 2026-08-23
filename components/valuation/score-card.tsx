import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VehicleScorecard } from "@/types/valuation";
import { cn } from "@/lib/utils";

export function ScoreCard({ scores }: { scores: VehicleScorecard }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Score del vehículo</CardDescription>
        <CardTitle>
          {scores.overall != null ? `${scores.overall}/100` : "Sin score global"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{scores.summary}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {scores.dimensions.map((dimension) => (
          <div key={dimension.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{dimension.label}</span>
              <span className="text-muted-foreground">
                {dimension.score == null ? "Sin datos suficientes" : `${dimension.score}/100`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  dimension.score == null
                    ? "w-0"
                    : dimension.score >= 80
                      ? "bg-emerald-600"
                      : dimension.score >= 65
                        ? "bg-amber-500"
                        : "bg-red-500",
                )}
                style={{ width: `${dimension.score ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{dimension.reason}</p>
            {dimension.evidence ? (
              <p className="text-[11px] text-muted-foreground/80">Evidencia: {dimension.evidence}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
