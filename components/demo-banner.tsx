import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { VehicleIdentity } from "@/types/identity";
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
      "No se pudieron obtener comparables de coches.net. No mostramos un precio de mercado inventado. Fiabilidad y mantenimiento sí vienen de datos curados cuando la identidad del coche es coherente.",
  },
  demo: {
    title: "Modo demostración",
    description: "Algunos datos siguen siendo simulados. Conecta portales reales para mayor fiabilidad.",
  },
};

export function DemoBanner({
  dataMode = "knowledge",
  identity,
}: {
  dataMode?: DataMode;
  identity?: VehicleIdentity;
}) {
  if (identity && !identity.safeForTechnicalKnowledge) {
    return (
      <Alert
        variant="destructive"
        className="border-destructive/40 bg-destructive/10 text-destructive dark:text-red-100"
      >
        <AlertTitle>Datos del vehículo incoherentes</AlertTitle>
        <AlertDescription>
          Marca, modelo, versión o combustible se contradicen. Corrígelos antes de fiarte del análisis técnico o del
          precio. El conocimiento RAG está bloqueado para evitar alucinaciones.
        </AlertDescription>
      </Alert>
    );
  }

  if (identity?.status === "suspicious") {
    return (
      <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50">
        <AlertTitle>Revisa los datos del anuncio</AlertTitle>
        <AlertDescription>
          Hay señales de inconsistencia ({identity.issues.length} aviso
          {identity.issues.length === 1 ? "" : "s"}). El análisis continúa con precaución.
        </AlertDescription>
      </Alert>
    );
  }

  const copy = COPY[dataMode] ?? COPY.knowledge;

  return (
    <Alert className="border-sky-500/30 bg-sky-500/10 text-sky-950 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-50">
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.description}</AlertDescription>
    </Alert>
  );
}
