import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { VehicleIdentity } from "@/types/identity";

export function IdentityAlert({ identity }: { identity: VehicleIdentity }) {
  if (identity.status === "ok") return null;

  const blocking = identity.issues.filter((issue) => issue.severity === "blocking");
  const warnings = identity.issues.filter((issue) => issue.severity === "warning");

  return (
    <Alert variant={identity.status === "invalid" ? "destructive" : "default"}>
      <AlertTitle>
        {identity.status === "invalid"
          ? "Datos del vehículo incoherentes"
          : "Revisa los datos del vehículo"}
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc space-y-2 pl-4">
          {[...blocking, ...warnings].map((issue) => (
            <li key={issue.code}>
              <span>{issue.message}</span>
              <span className="mt-0.5 block text-xs opacity-80">{issue.suggestion}</span>
            </li>
          ))}
        </ul>
        {identity.status === "invalid" ? (
          <p className="mt-3 text-sm">
            No generamos conocimiento técnico ni veredicto de precio fiable hasta corregir estos
            datos.
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
