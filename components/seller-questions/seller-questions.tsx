import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SellerQuestion } from "@/types/valuation";

const PRIORITY_STYLES: Record<string, string> = {
  alta: "bg-red-500/15 text-red-800 dark:text-red-200",
  media: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  baja: "bg-muted text-muted-foreground",
};

export function SellerQuestions({ questions }: { questions: SellerQuestion[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preguntas al vendedor</CardTitle>
        <CardDescription>
          Máximo 8, priorizadas para este coche. No se preguntan temas irrelevantes (p. ej. batería HV en
          gasolina).
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
                  <Badge className={PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.media} variant="secondary">
                    {item.priority}
                  </Badge>
                ) : null}
                {item.category ? (
                  <Badge variant="outline">{item.category}</Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground">{item.reason ?? item.why}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
