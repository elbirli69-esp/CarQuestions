import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField } from "@/components/expert/editable-field";
import type { ConsistencyReport } from "@/lib/vehicles/consistency";

export function ConsistencyAlert({
  report,
  expertMode = false,
  onSummaryChange,
  onIssueChange,
}: {
  report: ConsistencyReport;
  expertMode?: boolean;
  onSummaryChange?: (value: string) => void;
  onIssueChange?: (index: number, message: string) => void;
}) {
  if (report.status === "valid") return null;

  const isInvalid = report.status === "invalid";

  return (
    <Card
      className={
        isInvalid
          ? "border-red-500/40 bg-red-500/10"
          : "border-amber-500/40 bg-amber-500/10"
      }
    >
      <CardHeader>
        <CardTitle className="text-lg">
          {isInvalid ? "Datos del vehículo incoherentes" : "Datos dudosos"}
        </CardTitle>
        <CardDescription className={isInvalid ? "text-red-950/80 dark:text-red-50/80" : undefined}>
          <EditableField
            expertMode={expertMode}
            value={report.summary}
            label="Resumen coherencia"
            multiline
            onChange={onSummaryChange}
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-4 text-sm">
          {report.issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>
              <span className="font-medium">
                {issue.severity === "error" ? "Error" : issue.severity === "warning" ? "Aviso" : "Info"}
                :{" "}
              </span>
              <EditableField
                expertMode={expertMode}
                value={issue.message}
                label={`Incidencia ${index + 1}`}
                onChange={(value) => onIssueChange?.(index, value)}
              />
            </li>
          ))}
        </ul>
        {report.blockModelKnowledge ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Se ha bloqueado el conocimiento técnico del modelo y las preguntas específicas hasta que
            corrijas la ficha.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
