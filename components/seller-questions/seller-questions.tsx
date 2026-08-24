import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SellerQuestion } from "@/types/valuation";

const PRIORITY_LABELS = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
} as const;

export function SellerQuestions({ questions }: { questions: SellerQuestion[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preguntas al vendedor</CardTitle>
        <CardDescription>
          Máximo {questions.length} preguntas prioritarias, adaptadas a este coche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {questions.map((item, index) => (
            <li key={item.id ?? item.question} className="text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {index + 1}. {item.question}
                </span>
                {item.priority ? (
                  <Badge
                    variant={item.priority === "high" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {PRIORITY_LABELS[item.priority]}
                  </Badge>
                ) : null}
                {item.evidenceLevel && item.evidenceLevel !== "D" ? (
                  <Badge variant="outline" className="text-xs">
                    evidencia {item.evidenceLevel}
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground">{item.why}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
