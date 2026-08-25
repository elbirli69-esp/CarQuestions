import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField } from "@/components/expert/editable-field";
import type { MissingDataReport } from "@/lib/vehicles/missing-data";

export function MissingDataCard({
  report,
  expertMode = false,
  onHeadlineChange,
  onItemReasonChange,
}: {
  report: MissingDataReport;
  expertMode?: boolean;
  onHeadlineChange?: (value: string) => void;
  onItemReasonChange?: (index: number, reason: string) => void;
}) {
  if (report.items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Para mejorar la valoración necesito…</CardTitle>
        <CardDescription>
          <EditableField
            expertMode={expertMode}
            value={report.headline}
            label="Titular datos faltantes"
            multiline
            onChange={onHeadlineChange}
          />
        </CardDescription>
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
              <EditableField
                expertMode={expertMode}
                value={item.reason}
                label={`Motivo ${item.label}`}
                multiline
                className="text-muted-foreground"
                onChange={(value) => onItemReasonChange?.(index, value)}
              />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
