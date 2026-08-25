import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField } from "@/components/expert/editable-field";
import type { IdentityEvidenceChain } from "@/lib/vehicles/identity";

const SOURCE_LABELS: Record<string, string> = {
  user: "Usuario / formulario",
  catalog: "Catálogo verificado",
  listing: "Anuncio scrapeado",
  inferred: "Inferido",
  unknown: "Desconocido",
};

export function IdentityEvidenceCard({
  evidence,
  expertMode = false,
  onSummaryChange,
  onFieldChange,
}: {
  evidence: IdentityEvidenceChain;
  expertMode?: boolean;
  onSummaryChange?: (value: string) => void;
  onFieldChange?: (field: string, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Identidad del vehículo</CardTitle>
        <CardDescription>
          <EditableField
            expertMode={expertMode}
            value={evidence.summary}
            label="Resumen de identidad"
            multiline
            onChange={onSummaryChange}
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {evidence.trimCatalogMatch ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Versión en catálogo</Badge>
            {evidence.engineCode ? <Badge variant="outline">Motor {evidence.engineCode}</Badge> : null}
          </div>
        ) : (
          <Badge variant="outline">Versión no verificada en catálogo</Badge>
        )}
        <ul className="space-y-2 text-sm">
          {evidence.fields.map((field) => (
            <li key={field.field} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="font-medium">{field.label}:</span>
                <EditableField
                  expertMode={expertMode}
                  value={field.value}
                  label={field.label}
                  onChange={(value) => onFieldChange?.(field.field, value)}
                />
              </span>
              <span className="text-xs text-muted-foreground">
                {SOURCE_LABELS[field.source] ?? field.source}
                {field.verified ? " · verificado" : ""}
                {field.confidence !== "high" ? ` · confianza ${field.confidence}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Mercado y conocimiento técnico solo se aplican cuando marca, modelo y versión son coherentes.
        </p>
      </CardContent>
    </Card>
  );
}
