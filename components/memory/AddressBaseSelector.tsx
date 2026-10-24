"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADDRESS_BASE_OPTIONS, type AddressBase } from "@/lib/memory/memory-types";

type AddressBaseSelectorProps = {
  value: AddressBase;
  onChange: (base: AddressBase) => void;
};

export function AddressBaseSelector({ value, onChange }: AddressBaseSelectorProps) {
  const current = ADDRESS_BASE_OPTIONS.find((option) => option.id === value);

  return (
    <div className="flex items-center gap-2">
      <span id="address-base-label" className="hidden text-xs text-muted-foreground sm:inline">
        Address
      </span>
      <Select
        value={value}
        onValueChange={(next) => {
          const option = ADDRESS_BASE_OPTIONS.find((item) => item.id === next);
          if (option) onChange(option.id);
        }}
      >
        <SelectTrigger aria-labelledby="address-base-label" size="sm" className="w-[92px] sm:w-[100px]">
          <SelectValue>{() => current?.label ?? "Hex"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ADDRESS_BASE_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
