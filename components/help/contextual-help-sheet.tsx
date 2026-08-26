"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HelpStep } from "@/lib/help/guide";
import { writeContextHelpSeen } from "@/lib/help/guide";

export function ContextualHelpSheet({
  step,
  contextId,
  open,
  onOpenChange,
}: {
  step: HelpStep | null;
  contextId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!step) return null;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      writeContextHelpSeen(contextId);
    }
  }

  function acknowledge() {
    writeContextHelpSeen(contextId);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[75vh] w-full max-w-3xl gap-0 overflow-y-auto rounded-t-2xl border-x border-t p-0 sm:max-w-3xl"
        showCloseButton
      >
        <SheetHeader className="border-b px-5 pt-5 pb-4 sm:px-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Ayuda · {step.title}
          </p>
          <SheetTitle className="text-xl sm:text-2xl">{step.title}</SheetTitle>
          <SheetDescription className="text-base leading-relaxed text-muted-foreground">
            {step.body}
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-5 sm:px-6">
          {step.bullets && step.bullets.length > 0 ? (
            <ul className="space-y-2.5 text-sm leading-6 text-foreground/90">
              {step.bullets.map((item) => (
                <li key={item} className="flex gap-2">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/50"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <SheetFooter className="border-t px-5 py-4 sm:px-6">
          <Button type="button" className="min-h-11 w-full" onClick={acknowledge}>
            Entendido
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
