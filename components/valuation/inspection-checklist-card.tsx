import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InspectionChecklist } from "@/types/analysis";

export function InspectionChecklistCard({ checklist }: { checklist: InspectionChecklist }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de inspección</CardTitle>
        <CardDescription>{checklist.note}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {checklist.stages.map((stage) => (
            <AccordionItem key={stage.stage} value={stage.stage}>
              <AccordionTrigger>
                {stage.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({stage.items.length})
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-3 text-sm text-muted-foreground">{stage.description}</p>
                <ul className="space-y-3">
                  {stage.items.map((item) => (
                    <li key={item.id} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.text}</span>
                        {item.critical ? (
                          <Badge variant="destructive" className="text-xs">
                            crítico
                          </Badge>
                        ) : null}
                        {item.evidenceLevel !== "D" ? (
                          <Badge variant="outline" className="text-xs">
                            evidencia {item.evidenceLevel}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">{item.why}</p>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
