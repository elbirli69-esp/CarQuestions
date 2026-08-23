import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SellerQuestion } from "@/types/valuation";

const PRIORITY_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function SellerQuestions({ questions }: { questions: SellerQuestion[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preguntas al vendedor</CardTitle>
        <CardDescription>Máximo 8, ordenadas por prioridad. Nada que no encaje con este combustible.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {questions.map((item) => (
            <li key={item.question} className="text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {item.priority ? (
                  <Badge variant={item.priority === "alta" ? "destructive" : "secondary"}>
                    {PRIORITY_LABEL[item.priority] ?? item.priority}
                  </Badge>
                ) : null}
                {item.category ? (
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                ) : null}
              </div>
              <p className="font-medium">{item.question}</p>
              <p className="text-muted-foreground">{item.reason ?? item.why}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
