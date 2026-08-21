import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function DemoBanner({ text }: { text?: string }) {
  return (
    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50">
      <AlertTitle>Datos de demostración</AlertTitle>
      <AlertDescription>
        {text ??
          "Los anuncios y percentiles son simulados. La fiabilidad viene del corpus RAG curado. No sustituye una inspección ni una tasación oficial."}
      </AlertDescription>
      <Badge
        variant="outline"
        className="mt-2 border-amber-500/40 bg-background/80 text-amber-900 dark:text-amber-100"
      >
        Demo
      </Badge>
    </Alert>
  );
}
