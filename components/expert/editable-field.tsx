"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function EditableField({
  expertMode,
  value,
  onChange,
  multiline,
  className,
  label,
  placeholder,
}: {
  expertMode: boolean;
  value: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
}) {
  if (!expertMode) {
    return <span className={className}>{value}</span>;
  }

  if (multiline) {
    return (
      <Textarea
        aria-label={label}
        value={value}
        placeholder={placeholder}
        className={cn("min-h-[72px] text-sm", className)}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  }

  return (
    <Input
      aria-label={label}
      value={value}
      placeholder={placeholder}
      className={cn("text-sm", className)}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

export function EditableListField({
  expertMode,
  items,
  onChange,
  label,
  emptyHint,
}: {
  expertMode: boolean;
  items: string[];
  onChange?: (items: string[]) => void;
  label: string;
  emptyHint?: string;
}) {
  const text = items.join("\n");

  if (!expertMode) {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyHint ?? "—"}</p>;
    }
    return (
      <ul className="list-disc space-y-1 pl-4 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <Textarea
      aria-label={label}
      value={text}
      placeholder="Un ítem por línea"
      className="min-h-[100px] text-sm"
      onChange={(event) => {
        const lines = event.target.value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        onChange?.(lines);
      }}
    />
  );
}
