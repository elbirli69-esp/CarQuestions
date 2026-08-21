import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-2xl font-medium">Análisis no encontrado</h1>
      <p className="text-muted-foreground">
        Este análisis no está disponible. En el MVP los resultados no se guardan de forma permanente: vuelve a analizar el coche.
      </p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
