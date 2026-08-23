import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MissingDataReport } from "@/types/valuation";

export function MissingDataCard({ report }: { report: MissingDataReport }) {
  if (report.items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Para mejorar la valoración necesito…</CardTitle>
        <CardDescription>{report.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {report.items.map((item, index) => (
            <li key={item.field}>
              <span className="font-medium">
                {index + 1}. {item.label}
              </span>
              <span className="block text-muted-foreground">
                +{item.impactPercent} puntos de precisión · {item.reason}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
