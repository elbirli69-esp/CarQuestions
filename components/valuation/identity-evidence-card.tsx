import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IdentityEvidenceChain } from "@/lib/vehicles/identity";

const SOURCE_LABELS: Record<string, string> = {
  user: "Usuario / formulario",
  catalog: "Catálogo verificado",
  listing: "Anuncio scrapeado",
  inferred: "Inferido",
  unknown: "Desconocido",
};

export function IdentityEvidenceCard({ evidence }: { evidence: IdentityEvidenceChain }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Identidad del vehículo</CardTitle>
        <CardDescription>{evidence.summary}</CardDescription>
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
            <li key={field.field} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="font-medium">{field.label}:</span> {field.value}
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
