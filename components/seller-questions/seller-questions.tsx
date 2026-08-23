import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SellerQuestion } from "@/types/valuation";

const PRIORITY_STYLES = {
  high: "destructive" as const,
  medium: "secondary" as const,
  low: "outline" as const,
};

const PRIORITY_LABELS = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export function SellerQuestions({ questions }: { questions: SellerQuestion[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preguntas al vendedor</CardTitle>
        <CardDescription>
          Máximo {questions.length} preguntas prioritarias para este coche, no una lista genérica.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {questions.map((item, index) => (
            <li key={item.question} className="text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {index + 1}. {item.question}
                </p>
                {item.priority ? (
                  <Badge variant={PRIORITY_STYLES[item.priority]}>{PRIORITY_LABELS[item.priority]}</Badge>
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
