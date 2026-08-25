"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle({
  layout = "icon",
}: {
  layout?: "icon" | "buttons";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    if (layout === "buttons") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="min-h-12" disabled>Claro</Button>
          <Button type="button" variant="outline" className="min-h-12" disabled>Oscuro</Button>
        </div>
      );
    }
    return (
      <Button type="button" variant="outline" className="min-h-11 min-w-11" aria-label="Cambiar tema" disabled>
        <SunIcon className="size-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  if (layout === "buttons") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={!isDark ? "default" : "outline"}
          className="min-h-12 gap-2"
          aria-pressed={!isDark}
          onClick={() => setTheme("light")}
        >
          <SunIcon className="size-5" aria-hidden />
          Claro
        </Button>
        <Button
          type="button"
          variant={isDark ? "default" : "outline"}
          className="min-h-12 gap-2"
          aria-pressed={isDark}
          onClick={() => setTheme("dark")}
        >
          <MoonIcon className="size-5" aria-hidden />
          Oscuro
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 min-w-11 shrink-0"
      aria-label={isDark ? "Activar tema claro" : "Activar tema oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon className="size-5" aria-hidden /> : <MoonIcon className="size-5" aria-hidden />}
      <span className="hidden sm:inline">{isDark ? "Claro" : "Oscuro"}</span>
    </Button>
  );
}

export function ThemeToggleLabel({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  if (!mounted) return null;
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Tema actual: {resolvedTheme === "dark" ? "oscuro" : "claro"}
    </p>
  );
}
