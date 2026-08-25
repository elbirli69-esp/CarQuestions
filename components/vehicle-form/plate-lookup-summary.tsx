import type { PlateLookupFieldKey, PlateLookupMissingKey } from "@/types/source";
import {
  hintForMissingField,
  labelForMissingField,
  labelForPlateField,
} from "@/lib/sources/plate/field-report";
import { Badge } from "@/components/ui/badge";

export function PlateLookupSummary({
  filledFields,
  missingFields,
  sources,
  message,
}: {
  filledFields?: PlateLookupFieldKey[];
  missingFields?: PlateLookupMissingKey[];
  sources?: string[];
  message?: string;
}) {
  if (!filledFields?.length && !missingFields?.length && !message) return null;

  return (
    <div
      className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm sm:col-span-2"
      aria-live="polite"
    >
      {message ? <p className="mb-2 text-muted-foreground">{message}</p> : null}

      {filledFields && filledFields.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">Desde matrícula:</span>
          {filledFields.map((field) => (
            <Badge key={field} variant="secondary" className="text-xs">
              {labelForPlateField(field)}
            </Badge>
          ))}
        </div>
      ) : null}

      {missingFields && missingFields.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="font-medium text-foreground">Aún falta (no sale del registro):</li>
          {missingFields.map((field) => (
            <li key={field}>
              <span className="font-medium">{labelForMissingField(field)}</span>
              {" — "}
              {hintForMissingField(field)}
            </li>
          ))}
        </ul>
      ) : null}

      {sources && sources.length > 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground/80">Fuente: {sources.join(" + ")}</p>
      ) : null}
    </div>
  );
}
