import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MissingDataReport } from "@/lib/vehicles/missing-data";

export function MissingDataCard({ report }: { report: MissingDataReport }) {
  if (report.items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Para mejorar la valoración necesito…</CardTitle>
        <CardDescription>{report.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Completitud actual: {report.completenessPercent} %
        </p>
        <ol className="space-y-3">
          {report.items.map((item, index) => (
            <li key={item.field} className="text-sm">
              <p className="font-medium">
                {index + 1}. {item.label}{" "}
                <span className="text-muted-foreground">(~{item.impactPercent} % impacto)</span>
              </p>
              <p className="text-muted-foreground">{item.reason}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
