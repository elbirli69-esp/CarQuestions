"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { CircleHelpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HELP_STEPS, readWelcomeHelpSeen, writeWelcomeHelpSeen } from "@/lib/help/guide";
import { cn } from "@/lib/utils";

export type HelpGuideHandle = {
  open: () => void;
};

export const HelpGuide = forwardRef<HelpGuideHandle, { showTrigger?: boolean }>(function HelpGuide(
  { showTrigger = true },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      setStepIndex(0);
      setOpen(true);
    },
  }));

  useEffect(() => {
    const seen = readWelcomeHelpSeen();
    setReady(true);
    if (!seen) {
      setStepIndex(0);
      setOpen(true);
    }
  }, []);

  function markSeenAndClose() {
    writeWelcomeHelpSeen();
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      writeWelcomeHelpSeen();
      setStepIndex(0);
    }
  }

  function openHelp() {
    setStepIndex(0);
    setOpen(true);
  }

  const step = HELP_STEPS[stepIndex] ?? HELP_STEPS[0]!;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === HELP_STEPS.length - 1;

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11 shrink-0"
          aria-label="Cómo funciona CarQuestions"
          onClick={openHelp}
          disabled={!ready}
        >
          <CircleHelpIcon className="size-5" aria-hidden />
          <span className="hidden sm:inline">Ayuda</span>
        </Button>
      ) : null}

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[88vh] w-full max-w-3xl gap-0 overflow-y-auto rounded-t-2xl border-x border-t p-0 sm:max-w-3xl"
          showCloseButton
        >
          <SheetHeader className="border-b px-5 pt-5 pb-4 sm:px-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Modo ayuda · {stepIndex + 1}/{HELP_STEPS.length}
            </p>
            <SheetTitle className="text-xl sm:text-2xl">{step.title}</SheetTitle>
            <SheetDescription className="text-base leading-relaxed text-muted-foreground">
              {step.body}
            </SheetDescription>
          </SheetHeader>

          <div
            key={step.id}
            className="animate-in fade-in-0 slide-in-from-bottom-2 px-5 py-5 duration-300 sm:px-6"
          >
            {step.bullets && step.bullets.length > 0 ? (
              <ul className="space-y-2.5 text-sm leading-6 text-foreground/90">
                {step.bullets.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/50" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Puedes reabrir esta guía desde el menú de la cabecera o el botón Ayuda en pantallas
                grandes.
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden>
              {HELP_STEPS.map((item, index) => (
                <span
                  key={item.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === stepIndex ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25",
                  )}
                />
              ))}
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t px-5 py-4 sm:px-6">
            {!isFirst ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                onClick={() => setStepIndex((i) => i - 1)}
              >
                Atrás
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="min-h-11 flex-1" onClick={markSeenAndClose}>
                Saltar
              </Button>
            )}
            {isLast ? (
              <Button type="button" className="min-h-11 flex-1" onClick={markSeenAndClose}>
                Empezar
              </Button>
            ) : (
              <Button type="button" className="min-h-11 flex-1" onClick={() => setStepIndex((i) => i + 1)}>
                Siguiente
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
});
