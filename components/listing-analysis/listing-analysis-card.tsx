import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EVIDENCE_LEVEL_SHORT } from "@/types/evidence";
import type { ListingAnalysis } from "@/types/valuation";
import type { TechnicalKnowledge } from "@/types/technical";

export function ListingAnalysisCard({
  analysis,
  knowledge,
}: {
  analysis: ListingAnalysis;
  knowledge: TechnicalKnowledge;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Conocimiento técnico del modelo</CardTitle>
          <CardDescription>{knowledge.headline}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {knowledge.status === "blocked" ? (
            <p className="text-muted-foreground">{knowledge.notes[0]}</p>
          ) : null}

          {knowledge.modelSpecific.length > 0 ? (
            <section>
              <h3 className="mb-2 font-medium">Patrones documentados de este modelo</h3>
              <ul className="space-y-3">
                {knowledge.modelSpecific.map((finding) => (
                  <FindingItem key={finding.id} finding={finding} />
                ))}
              </ul>
            </section>
          ) : null}

          {knowledge.platformShared.length > 0 ? (
            <section>
              <h3 className="mb-2 font-medium">Plataforma / motor compartido</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                No confirmados para tu versión exacta. Trátalos como indicios, no como diagnóstico.
              </p>
              <ul className="space-y-3">
                {knowledge.platformShared.map((finding) => (
                  <FindingItem key={finding.id} finding={finding} />
                ))}
              </ul>
            </section>
          ) : null}

          {knowledge.segmentContext.length > 0 ? (
            <section>
              <h3 className="mb-2 font-medium">Contexto del segmento (no es avería confirmada)</h3>
              <ul className="space-y-2 text-muted-foreground">
                {knowledge.segmentContext.map((finding) => (
                  <li key={finding.id}>· {finding.title}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {knowledge.modelSpecific.length === 0 &&
          knowledge.platformShared.length === 0 &&
          knowledge.status !== "blocked" ? (
            <p className="text-muted-foreground">
              No tenemos evidencia suficiente para afirmar problemas conocidos de este modelo.
            </p>
          ) : null}

          {knowledge.maintenance.available ? (
            <section className="border-t pt-4">
              <h3 className="mb-2 font-medium">Mantenimiento documentado</h3>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {knowledge.maintenance.items.map((item) => (
                  <li key={item.title}>{item.detail}</li>
                ))}
              </ul>
              {knowledge.maintenance.estimatedYearlyCostEur ? (
                <p className="mt-2 text-muted-foreground">
                  Coste anual orientativo: {knowledge.maintenance.estimatedYearlyCostEur.toLocaleString("es-ES")} €
                </p>
              ) : null}
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function FindingItem({
  finding,
}: {
  finding: TechnicalKnowledge["modelSpecific"][number];
}) {
  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{finding.title}</p>
        <Badge variant={finding.severity === "high" ? "destructive" : "secondary"}>
          {finding.severity === "high" ? "alto" : finding.severity === "medium" ? "medio" : "bajo"}
        </Badge>
        <Badge variant="outline">{EVIDENCE_LEVEL_SHORT[finding.evidence.level]}</Badge>
      </div>
      <p className="text-muted-foreground">{finding.detail}</p>
      <p className="text-xs text-muted-foreground">Fuente: {finding.evidence.source}</p>
    </li>
  );
}
