import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ListingQuality } from "@/types/analysis";
import { cn } from "@/lib/utils";

export function ListingQualityCard({ quality }: { quality: ListingQuality }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Calidad de la información</CardDescription>
        <CardTitle className="text-2xl">
          {quality.score}/100 ·{" "}
          <span className="capitalize">{quality.level.replace("_", " ")}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{quality.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              quality.score >= 75
                ? "bg-emerald-600"
                : quality.score >= 50
                  ? "bg-amber-500"
                  : "bg-red-500",
            )}
            style={{ width: `${quality.score}%` }}
          />
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {quality.criteria.map((criterion) => (
            <li
              key={criterion.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                criterion.present ? "bg-emerald-500/10" : "bg-muted/50",
              )}
            >
              <span className="font-medium">{criterion.present ? "✓" : "○"} {criterion.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{criterion.detail}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
