import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DataMode } from "@/types/valuation";

const COPY: Record<DataMode, { title: string; description: string }> = {
  live: {
    title: "Mercado observado",
    description:
      "La valoración usa anuncios reales de coches.net. El conocimiento técnico solo aparece si hay evidencia específica del modelo.",
  },
  mixed: {
    title: "Mercado + conocimiento",
    description:
      "Combinamos anuncios reales con conocimiento del modelo. Si el corpus está en demo, se etiqueta como tal.",
  },
  knowledge: {
    title: "Sin mercado comparable",
    description:
      "No hay anuncios suficientes para un precio de mercado. No inventamos una mediana. Puede haber conocimiento técnico del modelo si existe evidencia.",
  },
  demo: {
    title: "Datos limitados / demo",
    description:
      "Parte del conocimiento o del mercado no está verificado. Preferimos decir «no lo sabemos» a fingir precisión.",
  },
};

export function DemoBanner({ dataMode = "knowledge" }: { dataMode?: DataMode; text?: string }) {
  const copy = COPY[dataMode] ?? COPY.knowledge;

  return (
    <Alert className="border-sky-500/30 bg-sky-500/10 text-sky-950 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-50">
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.description}</AlertDescription>
    </Alert>
  );
}
