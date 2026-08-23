import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MissingDataSuggestion } from "@/types/valuation";

const IMPACT_LABELS: Record<MissingDataSuggestion["impact"], string> = {
  high: "Alto impacto",
  medium: "Impacto medio",
  low: "Impacto bajo",
};

export function MissingDataCard({ suggestions }: { suggestions: MissingDataSuggestion[] }) {
  if (suggestions.length === 0) return null;

  const highImpact = suggestions.filter((s) => s.impact === "high");
  const improvementPct = Math.min(45, highImpact.length * 12 + suggestions.length * 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Para mejorar la valoración</CardTitle>
        <CardDescription>
          Puedes mejorar la precisión un ~{improvementPct} % completando estos datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {suggestions.map((item, index) => (
            <li key={item.field} className="text-sm">
              <p className="font-medium">
                {index + 1}. {item.label}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({IMPACT_LABELS[item.impact]})
                </span>
              </p>
              <p className="text-muted-foreground">{item.message}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
