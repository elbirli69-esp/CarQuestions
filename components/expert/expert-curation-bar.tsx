"use client";

import { DownloadIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ExpertCurationBar({
  hasChanges,
  saveStatus,
  onSave,
  onReset,
  onExport,
}: {
  hasChanges: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
  onReset: () => void;
  onExport: () => void;
}) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Modo experto</Badge>
            {hasChanges ? <Badge variant="outline">Cambios sin guardar</Badge> : null}
            {saveStatus === "saved" ? <Badge className="bg-emerald-600">Guardado</Badge> : null}
            {saveStatus === "error" ? <Badge variant="destructive">Error al guardar</Badge> : null}
          </div>
          <p id="expert-mode-hint" className="text-sm text-muted-foreground">
            Edita el texto mostrado para curar y mejorar la información. Los cambios no alteran el scrape
            original; marca el análisis como curado por experto.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={onReset}
            disabled={!hasChanges}
          >
            <RotateCcwIcon className="size-4" aria-hidden />
            Restaurar original
          </Button>
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={onExport}>
            <DownloadIcon className="size-4" aria-hidden />
            Exportar JSON
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={onSave}
            disabled={!hasChanges || saveStatus === "saving"}
          >
            <SaveIcon className="size-4" aria-hidden />
            {saveStatus === "saving" ? "Guardando…" : "Guardar curación"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
