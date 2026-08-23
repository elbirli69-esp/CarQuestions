import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InspectionChecklist, InspectionPhase } from "@/types/valuation";

const PHASES: Array<{ id: InspectionPhase; label: string }> = [
  { id: "before", label: "Antes de ir" },
  { id: "cold", label: "En frío" },
  { id: "drive", label: "Durante la prueba" },
  { id: "hot", label: "En caliente" },
  { id: "pay", label: "Antes de pagar" },
];

export function InspectionChecklistCard({ checklist }: { checklist: InspectionChecklist }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de inspección</CardTitle>
        <CardDescription>Adaptada a {checklist.adaptedTo}. No sustituye un peritaje.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["before", "cold"]}>
          {PHASES.map((phase) => {
            const items = checklist.items.filter((item) => item.phase === phase.id);
            if (items.length === 0) return null;
            return (
              <AccordionItem key={phase.id} value={phase.id}>
                <AccordionTrigger>{phase.label}</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm">
                    {items.map((item) => (
                      <li key={item.title}>
                        <span className="font-medium">{item.title}</span>
                        <span className="block text-muted-foreground">{item.detail}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
