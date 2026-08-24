import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MissingDataReport } from "@/types/analysis";

export function MissingDataCard({ report }: { report: MissingDataReport }) {
  if (report.items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Para mejorar la valoración</CardDescription>
        <CardTitle className="text-lg">Datos que más impacto tienen</CardTitle>
        <p className="text-sm text-muted-foreground">{report.summary}</p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {report.items.map((item, index) => (
            <li key={item.field} className="text-sm">
              <p className="font-medium">
                {index + 1}. {item.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  impacto {item.impact}/10
                </span>
              </p>
              <p className="text-muted-foreground">{item.why}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
