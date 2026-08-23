import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConsistencyReport } from "@/lib/vehicles/consistency";

export function ConsistencyAlert({ report }: { report: ConsistencyReport }) {
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
          {report.summary}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-4 text-sm">
          {report.issues.map((issue) => (
            <li key={`${issue.code}-${issue.message}`}>
              <span className="font-medium">
                {issue.severity === "error" ? "Error" : issue.severity === "warning" ? "Aviso" : "Info"}
                :{" "}
              </span>
              {issue.message}
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
