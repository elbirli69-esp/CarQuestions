"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-2xl font-medium">Algo no ha ido bien</h1>
      <p className="text-muted-foreground">
        Ha ocurrido un error inesperado. Puedes reintentar o volver a introducir los datos del coche.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </main>
  );
}
