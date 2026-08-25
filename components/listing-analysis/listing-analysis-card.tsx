import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField, EditableListField } from "@/components/expert/editable-field";
import type { ListingAnalysis, MaintenanceSummary, ReliabilitySummary, SharedComponentSummary } from "@/types/valuation";

export function ListingAnalysisCard({
  analysis,
  reliability,
  sharedComponents,
  maintenance,
  expertMode = false,
  onAnalysisChange,
  onListChange,
  onKnownIssueChange,
  onReliabilityNoteChange,
  onSharedComponentIssueChange,
  onSharedComponentNoteChange,
}: {
  analysis: ListingAnalysis;
  reliability: ReliabilitySummary;
  sharedComponents: SharedComponentSummary;
  maintenance: MaintenanceSummary;
  expertMode?: boolean;
  onAnalysisChange?: (patch: Partial<ListingAnalysis>) => void;
  onListChange?: (
    field: "likes" | "concerns" | "askSeller" | "inspectBeforeBuying",
    items: string[],
  ) => void;
  onKnownIssueChange?: (index: number, patch: { title?: string; detail?: string }) => void;
  onReliabilityNoteChange?: (index: number, value: string) => void;
  onSharedComponentIssueChange?: (
    index: number,
    patch: { title?: string; detail?: string; matchReason?: string },
  ) => void;
  onSharedComponentNoteChange?: (index: number, value: string) => void;
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

      <Card>
        <CardHeader>
          <CardTitle>Componentes compartidos (nivel B)</CardTitle>
          <CardDescription>
            {sharedComponents.available
              ? `Motor o caja usados en varios modelos${sharedComponents.codesResolved ? ` · motor ${sharedComponents.resolvedEngineCode ?? "—"} · caja ${sharedComponents.resolvedGearboxCode ?? "—"}` : ""}${sharedComponents.isDemo ? " · corpus demo" : ""}. No sustituye confirmar la versión exacta.`
              : "Sin patrones de plataforma identificados para este vehículo."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {sharedComponents.available ? (
            <>
              {sharedComponents.notes.length > 0 ? (
                <ul className="space-y-1 text-muted-foreground">
                  {sharedComponents.notes.map((note, noteIndex) => (
                    <li key={`shared-note-${noteIndex}`}>
                      <EditableField
                        expertMode={expertMode}
                        value={note}
                        label={`Nota componente ${noteIndex + 1}`}
                        multiline
                        onChange={(value) => onSharedComponentNoteChange?.(noteIndex, value)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul className="space-y-3">
                {sharedComponents.issues.map((issue, index) => (
                  <li key={`${issue.title}-${index}`} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <EditableField
                        expertMode={expertMode}
                        value={issue.title}
                        label={`Componente ${index + 1}`}
                        className="font-medium"
                        onChange={(value) => onSharedComponentIssueChange?.(index, { title: value })}
                      />
                      <Badge variant={issue.severity === "high" ? "destructive" : "secondary"}>
                        {issue.severity === "high" ? "alto" : issue.severity === "medium" ? "medio" : "bajo"}
                      </Badge>
                      <Badge variant="outline">Nivel B</Badge>
                      <Badge variant={issue.matchConfidence === "confirmed" ? "default" : "outline"}>
                        {issue.matchConfidence === "confirmed" ? "código confirmado" : "posible"}
                      </Badge>
                      {issue.isDemo ? <Badge variant="outline">demo</Badge> : null}
                    </div>
                    <EditableField
                      expertMode={expertMode}
                      value={issue.detail}
                      label={`Detalle componente ${index + 1}`}
                      multiline
                      className="text-muted-foreground"
                      onChange={(value) => onSharedComponentIssueChange?.(index, { detail: value })}
                    />
                    <EditableField
                      expertMode={expertMode}
                      value={issue.matchReason}
                      label={`Motivo match ${index + 1}`}
                      multiline
                      className="text-xs text-muted-foreground"
                      onChange={(value) => onSharedComponentIssueChange?.(index, { matchReason: value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Códigos corpus: {issue.componentCodes.join(", ")} · Fuente: {issue.source}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EditableField
              expertMode={expertMode}
              value={sharedComponents.notes[0] ?? ""}
              label="Nota componentes compartidos"
              multiline
              className="text-muted-foreground"
              onChange={(value) => onSharedComponentNoteChange?.(0, value)}
            />
          )}
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
