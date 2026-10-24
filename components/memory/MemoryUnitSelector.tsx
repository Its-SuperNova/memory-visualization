"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEMORY_UNIT_OPTIONS, type MemoryUnit } from "@/lib/memory/memory-types";

type MemoryUnitSelectorProps = {
  value: MemoryUnit;
  onChange: (unit: MemoryUnit) => void;
};

export function MemoryUnitSelector({ value, onChange }: MemoryUnitSelectorProps) {
  const current = MEMORY_UNIT_OPTIONS.find((option) => option.id === value);

  return (
    <div className="flex items-center gap-2">
      <span id="memory-unit-label" className="hidden text-xs text-muted-foreground sm:inline">
        View
      </span>
      <Select
        value={value}
        onValueChange={(next) => {
          const option = MEMORY_UNIT_OPTIONS.find((item) => item.id === next);
          if (option) onChange(option.id);
        }}
      >
        <SelectTrigger aria-labelledby="memory-unit-label" size="sm" className="w-[84px] sm:w-[92px]">
          <SelectValue>{() => current?.label ?? "Bits"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MEMORY_UNIT_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
