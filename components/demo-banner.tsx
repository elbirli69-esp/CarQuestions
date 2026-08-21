import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function DemoBanner({ text }: { text?: string }) {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950">
      <AlertTitle>Datos de demostración</AlertTitle>
      <AlertDescription>
        {text ??
          "Todavía no hay portales reales conectados. Los anuncios, percentiles y parte de la fiabilidad son simulados para probar el producto. No los uses para comprar un coche."}
      </AlertDescription>
      <Badge variant="outline" className="mt-2 border-amber-300 bg-white text-amber-900">
        Demo
      </Badge>
    </Alert>
  );
}
