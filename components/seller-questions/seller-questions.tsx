import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SellerQuestion } from "@/types/valuation";

export function SellerQuestions({ questions }: { questions: SellerQuestion[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preguntas al vendedor</CardTitle>
        <CardDescription>Generadas para este coche concreto, no una lista genérica.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {questions.map((item, index) => (
            <li key={item.question} className="text-sm">
              <p className="font-medium">
                {index + 1}. {item.question}
              </p>
              <p className="text-muted-foreground">{item.why}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
