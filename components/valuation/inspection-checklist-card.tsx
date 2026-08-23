import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InspectionChecklist } from "@/lib/vehicles/inspection-checklist";

export function InspectionChecklistCard({ checklist }: { checklist: InspectionChecklist }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de inspección</CardTitle>
        <CardDescription>
          Adaptada al tipo de vehículo. Úsala en la visita; no sustituye un peritaje.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={checklist.phases.slice(0, 2).map((p) => p.id)}>
          {checklist.phases.map((phase) => (
            <AccordionItem key={phase.id} value={phase.id}>
              <AccordionTrigger>{phase.title}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3">
                  {phase.items.map((item) => (
                    <li key={item.item} className="text-sm">
                      <p className="font-medium">{item.item}</p>
                      <p className="text-muted-foreground">{item.reason}</p>
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
