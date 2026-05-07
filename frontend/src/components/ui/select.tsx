"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, className }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => { if (v !== null) onChange(v); }}>
      <SelectPrimitive.Trigger
        className={cn(
          "h-8 px-2 pr-7 text-sm bg-secondary border border-border/50 rounded-md outline-none inline-flex items-center gap-1.5 transition-colors hover:bg-accent focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20 text-foreground",
          className
        )}
      >
        <span>{options.find((o) => o.value === value)?.label ?? placeholder ?? value}</span>
        <SelectPrimitive.Icon className="absolute right-2">
          <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner className="isolate z-50 outline-none" sideOffset={4}>
          <SelectPrimitive.Popup className="max-h-(--available-height) min-w-[var(--anchor-width)] origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="w-3.5 h-3.5 text-cyan" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
