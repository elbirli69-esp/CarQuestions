import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ConsistencyReport } from "@/types/evidence";

export function ConsistencyAlert({ report }: { report: ConsistencyReport }) {
  if (report.status === "valid") return null;
  const title = report.status === "invalid" ? "Datos incoherentes" : "Datos sospechosos";
  return (
    <Alert variant={report.status === "invalid" ? "destructive" : "default"}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{report.summary}</p>
        {report.issues.length > 1 ? (
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {report.issues.map((issue) => (
              <li key={issue.code}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
        {report.status === "invalid" ? (
          <p className="mt-2">
            No generamos conocimiento técnico ni preguntas de modelo hasta que la identidad del coche sea coherente.
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
