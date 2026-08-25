import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField, EditableListField } from "@/components/expert/editable-field";
import type { ListingAnalysis, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";

export function ListingAnalysisCard({
  analysis,
  reliability,
  maintenance,
  expertMode = false,
  onAnalysisChange,
  onListChange,
  onKnownIssueChange,
  onReliabilityNoteChange,
}: {
  analysis: ListingAnalysis;
  reliability: ReliabilitySummary;
  maintenance: MaintenanceSummary;
  expertMode?: boolean;
  onAnalysisChange?: (patch: Partial<ListingAnalysis>) => void;
  onListChange?: (
    field: "likes" | "concerns" | "askSeller" | "inspectBeforeBuying",
    items: string[],
  ) => void;
  onKnownIssueChange?: (index: number, patch: { title?: string; detail?: string }) => void;
  onReliabilityNoteChange?: (index: number, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Calidad de la información del anuncio</CardTitle>
          <CardDescription>
            {analysis.limitations[0] ??
              "Basado en el formulario y, si pegaste URL, en los datos que se pudieron leer del anuncio."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <p className="font-heading text-4xl tracking-tight">{analysis.qualityScore}</p>
            <p className="pb-1 text-sm text-muted-foreground">/ 100</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <Fact
              label="Precio"
              value={analysis.price}
              expertMode={expertMode}
              onChange={(value) => onAnalysisChange?.({ price: value })}
            />
            <Fact
              label="Vehículo"
              value={analysis.vehicle}
              expertMode={expertMode}
              onChange={(value) => onAnalysisChange?.({ vehicle: value })}
            />
            <Fact
              label="Descripción"
              value={analysis.description}
              expertMode={expertMode}
              onChange={(value) => onAnalysisChange?.({ description: value })}
            />
            <Fact
              label="Equipamiento"
              value={analysis.equipment}
              expertMode={expertMode}
              onChange={(value) => onAnalysisChange?.({ equipment: value })}
            />
            <Fact
              label="Riesgo"
              value={analysis.risk}
              expertMode={expertMode}
              onChange={(value) =>
                onAnalysisChange?.({
                  risk: value as ListingAnalysis["risk"],
                })
              }
            />
          </div>
          {analysis.missingFields.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Falta: {analysis.missingFields.join(", ")}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ListCard
          title="Cosas que me gustan"
          items={analysis.likes}
          empty="Nada destacable todavía."
          expertMode={expertMode}
          onChange={(items) => onListChange?.("likes", items)}
        />
        <ListCard
          title="Cosas que me preocupan"
          items={analysis.concerns}
          empty="Faltan datos, no hay una preocupación concreta."
          expertMode={expertMode}
          onChange={(items) => onListChange?.("concerns", items)}
        />
        <ListCard
          title="Qué preguntaría al vendedor"
          items={analysis.askSeller}
          empty="Completa más datos para generar preguntas."
          expertMode={expertMode}
          onChange={(items) => onListChange?.("askSeller", items)}
        />
        <ListCard
          title="Qué revisaría antes de comprar"
          items={analysis.inspectBeforeBuying}
          empty=""
          expertMode={expertMode}
          onChange={(items) => onListChange?.("inspectBeforeBuying", items)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conocimiento técnico del modelo</CardTitle>
          <CardDescription>
            {reliability.available
              ? `Solo patrones con evidencia específica del modelo${reliability.score != null ? ` · score orientativo ${reliability.score}/100` : ""}${reliability.isDemo ? " · corpus demo" : ""}. No es un informe de este bastidor.`
              : "Sin evidencia suficiente específica del modelo."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {reliability.available ? (
            <ul className="space-y-3">
              {reliability.knownIssues.map((issue, index) => (
                <li key={`${issue.title}-${index}`} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <EditableField
                      expertMode={expertMode}
                      value={issue.title}
                      label={`Problema ${index + 1}`}
                      className="font-medium"
                      onChange={(value) => onKnownIssueChange?.(index, { title: value })}
                    />
                    <Badge variant={issue.severity === "high" ? "destructive" : "secondary"}>
                      {issue.severity === "high" ? "alto" : issue.severity === "medium" ? "medio" : "bajo"}
                    </Badge>
                    {issue.evidenceLevel ? (
                      <Badge variant="outline">Nivel {issue.evidenceLevel}</Badge>
                    ) : null}
                    {issue.isDemo ? <Badge variant="outline">demo</Badge> : null}
                  </div>
                  <EditableField
                    expertMode={expertMode}
                    value={issue.detail}
                    label={`Detalle problema ${index + 1}`}
                    multiline
                    className="text-muted-foreground"
                    onChange={(value) => onKnownIssueChange?.(index, { detail: value })}
                  />
                  <p className="text-xs text-muted-foreground">Fuente: {issue.source}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EditableField
              expertMode={expertMode}
              value={reliability.notes[0] ?? ""}
              label="Nota fiabilidad"
              multiline
              className="text-muted-foreground"
              onChange={(value) => onReliabilityNoteChange?.(0, value)}
            />
          )}

          {maintenance.available ? (
            <div className="space-y-2 border-t pt-4">
              <p className="font-medium">Mantenimiento y revisiones</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {[...maintenance.notes, ...maintenance.upcoming].slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {maintenance.estimatedYearlyCost ? (
                <p className="text-muted-foreground">
                  Coste anual orientativo del segmento: {maintenance.estimatedYearlyCost} €. No es una factura de este
                  coche.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({
  label,
  value,
  expertMode,
  onChange,
}: {
  label: string;
  value: string;
  expertMode?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {expertMode ? (
        <EditableField expertMode value={value} label={label} className="font-medium capitalize" onChange={onChange} />
      ) : (
        <p className="font-medium capitalize">{value}</p>
      )}
    </div>
  );
}

function ListCard({
  title,
  items,
  empty,
  expertMode,
  onChange,
}: {
  title: string;
  items: string[];
  empty: string;
  expertMode?: boolean;
  onChange?: (items: string[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <EditableListField
          expertMode={expertMode ?? false}
          items={items}
          label={title}
          emptyHint={empty}
          onChange={onChange}
        />
      </CardContent>
    </Card>
  );
}
