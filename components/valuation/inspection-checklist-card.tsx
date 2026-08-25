import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField } from "@/components/expert/editable-field";
import type { InspectionChecklist } from "@/lib/vehicles/inspection-checklist";

export function InspectionChecklistCard({
  checklist,
  expertMode = false,
  onItemChange,
}: {
  checklist: InspectionChecklist;
  expertMode?: boolean;
  onItemChange?: (
    phaseId: string,
    itemIndex: number,
    patch: { item?: string; reason?: string },
  ) => void;
}) {
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
                  {phase.items.map((item, itemIndex) => (
                    <li key={`${phase.id}-${itemIndex}-${item.item}`} className="text-sm">
                      <EditableField
                        expertMode={expertMode}
                        value={item.item}
                        label="Ítem checklist"
                        className="font-medium"
                        onChange={(value) => onItemChange?.(phase.id, itemIndex, { item: value })}
                      />
                      <EditableField
                        expertMode={expertMode}
                        value={item.reason}
                        label="Motivo ítem"
                        multiline
                        className="text-muted-foreground"
                        onChange={(value) => onItemChange?.(phase.id, itemIndex, { reason: value })}
                      />
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
