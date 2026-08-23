import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { VehicleValidationResult } from "@/types/vehicle-validation";

export function VehicleValidationAlert({ validation }: { validation: VehicleValidationResult }) {
  if (validation.issues.length === 0) return null;

  const errors = validation.issues.filter((issue) => issue.severity === "error");
  const warnings = validation.issues.filter((issue) => issue.severity === "warning");

  return (
    <div className="flex flex-col gap-3">
      {errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Datos del vehículo incoherentes</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {errors.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
            <p className="mt-3">
              No mostramos conocimiento técnico específico del modelo hasta corregir estos datos.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      {warnings.length > 0 ? (
        <Alert>
          <AlertTitle>Revisa estos datos</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {warnings.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
