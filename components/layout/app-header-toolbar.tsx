"use client";

import { useRef, useState } from "react";
import { CircleHelpIcon, MenuIcon } from "lucide-react";
import type { HelpGuideHandle } from "@/components/help/help-guide";
import { HelpGuide } from "@/components/help/help-guide";
import { ExpertModeToggle } from "@/components/expert/expert-mode-toggle";
import { ThemeToggle, ThemeToggleLabel } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppHeaderToolbar({
  expertMode,
  onExpertModeChange,
}: {
  expertMode: boolean;
  onExpertModeChange: (enabled: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const helpRef = useRef<HelpGuideHandle>(null);

  function openHelpFromMenu() {
    setMenuOpen(false);
    window.setTimeout(() => helpRef.current?.open(), 200);
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11 sm:hidden"
          aria-label="Abrir menú de opciones"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon className="size-5" aria-hidden />
        </Button>

        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
          <ExpertModeToggle enabled={expertMode} onChange={onExpertModeChange} layout="inline" />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            aria-label="Cómo funciona CarQuestions"
            onClick={() => helpRef.current?.open()}
          >
            <CircleHelpIcon className="size-5" aria-hidden />
            Ayuda
          </Button>
          <ThemeToggle layout="icon" />
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4">
          <SheetHeader className="text-left">
            <SheetTitle>Opciones</SheetTitle>
            <SheetDescription>Ayuda, apariencia y modo experto</SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-4">
            <ExpertModeToggle
              enabled={expertMode}
              onChange={onExpertModeChange}
              layout="card"
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Apariencia</p>
              <ThemeToggle layout="buttons" />
              <ThemeToggleLabel />
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full gap-2"
              onClick={openHelpFromMenu}
            >
              <CircleHelpIcon className="size-5" aria-hidden />
              Cómo funciona CarQuestions
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <HelpGuide ref={helpRef} showTrigger={false} />
    </>
  );
}
