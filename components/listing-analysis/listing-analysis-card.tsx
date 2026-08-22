import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ListingAnalysis, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";

export function ListingAnalysisCard({
  analysis,
  reliability,
  maintenance,
}: {
  analysis: ListingAnalysis;
  reliability: ReliabilitySummary;
  maintenance: MaintenanceSummary;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Análisis del anuncio</CardTitle>
          <CardDescription>Basado en el formulario, no en un scraping del portal.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <Fact label="Precio" value={analysis.price} />
          <Fact label="Vehículo" value={analysis.vehicle} />
          <Fact label="Descripción" value={analysis.description} />
          <Fact label="Equipamiento" value={analysis.equipment} />
          <Fact label="Riesgo" value={analysis.risk} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ListCard title="Cosas que me gustan" items={analysis.likes} empty="Nada destacable todavía." />
        <ListCard
          title="Cosas que me preocupan"
          items={analysis.concerns}
          empty="Faltan datos, no hay una preocupación concreta."
        />
        <ListCard
          title="Qué preguntaría al vendedor"
          items={analysis.askSeller}
          empty="Completa más datos para generar preguntas."
        />
        <ListCard title="Qué revisaría antes de comprar" items={analysis.inspectBeforeBuying} empty="" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conocimiento técnico del modelo</CardTitle>
          <CardDescription>
            {reliability.available
              ? `Patrones de foros/manuales/recalls${reliability.score != null ? ` · score orientativo ${reliability.score}/100` : ""}. No es un informe de este bastidor.`
              : "Sin ficha específica en la base de conocimiento."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {reliability.available ? (
            <ul className="space-y-3">
              {reliability.knownIssues.map((issue) => (
                <li key={issue.title} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{issue.title}</p>
                    <Badge variant={issue.severity === "high" ? "destructive" : "secondary"}>
                      {issue.severity === "high" ? "alto" : issue.severity === "medium" ? "medio" : "bajo"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{issue.detail}</p>
                  <p className="text-xs text-muted-foreground">Fuente: {issue.source}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{reliability.notes[0]}</p>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function ListCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
