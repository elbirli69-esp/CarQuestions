"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export interface CatalogSelectOption {
  value: string;
  label: string;
  /** Optional secondary line (e.g. year range, engine code). */
  description?: string;
}

export function CatalogSelect({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  required,
}: {
  id: string;
  options: CatalogSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q) ||
        (option.description?.toLowerCase().includes(q) ?? false),
    );
  }, [filter, options]);

  return (
    <div className="relative">
      <Input
        id={id}
        required={required && !value}
        disabled={disabled}
        placeholder={placeholder}
        value={open ? filter : (selected?.label ?? "")}
        onChange={(event) => {
          setFilter(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFilter(selected?.label ?? "");
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        autoComplete="off"
      />
      {open && !disabled ? (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">Sin resultados</li>
          ) : (
            filtered.slice(0, 80).map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onValueChange(option.value);
                    setFilter(option.label);
                    setOpen(false);
                  }}
                >
                  <span className="block font-medium leading-snug">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
