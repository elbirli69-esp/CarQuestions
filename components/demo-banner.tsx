import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DataMode } from "@/types/valuation";

const COPY: Record<DataMode, { title: string; description: string }> = {
  live: {
    title: "Datos de mercado observados",
    description:
      "La valoración usa anuncios reales de coches.net (España). La fiabilidad y el mantenimiento vienen de la base de conocimiento curada.",
  },
  mixed: {
    title: "Mercado observado + conocimiento curado",
    description:
      "Combinamos anuncios reales de coches.net con la base de conocimiento sobre fiabilidad y mantenimiento.",
  },
  knowledge: {
    title: "Sin anuncios de mercado",
    description:
      "No se pudieron obtener comparables de coches.net. El precio es una referencia orientativa por segmento. Fiabilidad y mantenimiento sí vienen de datos curados.",
  },
  demo: {
    title: "Modo demostración",
    description: "Algunos datos siguen siendo simulados. Conecta portales reales para mayor fiabilidad.",
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
