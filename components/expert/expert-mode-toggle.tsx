"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ExpertModeToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="expert-mode"
        checked={enabled}
        onCheckedChange={onChange}
        aria-describedby="expert-mode-hint"
      />
      <Label htmlFor="expert-mode" className="text-sm font-medium cursor-pointer">
        Modo experto
      </Label>
    </div>
  );
}
