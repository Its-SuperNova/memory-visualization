"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isMemorySize } from "@/lib/memory/memory-utils";
import { MEMORY_SIZE_OPTIONS, type MemorySize } from "@/lib/memory/memory-types";

type MemorySizeSelectorProps = {
  value: MemorySize;
  onChange: (size: MemorySize) => void;
};

export function MemorySizeSelector({ value, onChange }: MemorySizeSelectorProps) {
  const current = MEMORY_SIZE_OPTIONS.find((option) => option.id === value);

  return (
    <div className="flex items-center gap-2">
      <span id="memory-size-label" className="hidden text-xs text-muted-foreground sm:inline">
        Memory
      </span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string" && isMemorySize(next)) onChange(next);
        }}
      >
        <SelectTrigger
          aria-labelledby="memory-size-label"
          size="sm"
          className="w-[92px] font-mono sm:w-[108px]"
        >
          <SelectValue>{() => current?.label ?? "1 KB"}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {MEMORY_SIZE_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
