"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function ExpertModeToggle({
  enabled,
  onChange,
  layout = "inline",
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  layout?: "inline" | "card";
}) {
  if (layout === "card") {
    return (
      <div
        className={cn(
          "flex w-full min-h-14 items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3",
          enabled ? "border-primary/40 bg-primary/5" : "border-border",
        )}
      >
        <Label
          htmlFor="expert-mode-mobile"
          className="flex flex-col gap-0.5 cursor-pointer"
        >
          <span className="text-sm font-medium">Modo experto</span>
          <span className="text-xs text-muted-foreground">
            Edita y cura el análisis mostrado en pantalla
          </span>
        </Label>
        <Switch
          id="expert-mode-mobile"
          checked={enabled}
          onCheckedChange={onChange}
          aria-label="Modo experto"
          className="shrink-0"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg px-1">
      <Switch
        id="expert-mode"
        checked={enabled}
        onCheckedChange={onChange}
        aria-describedby="expert-mode-hint"
        className="scale-110 sm:scale-100"
      />
      <Label htmlFor="expert-mode" className="cursor-pointer text-sm font-medium">
        Modo experto
      </Label>
    </div>
  );
}
