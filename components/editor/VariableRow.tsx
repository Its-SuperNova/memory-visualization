"use client";

import { formatVariableBinary } from "@/lib/c-parser/binary-value";
import { formatCType } from "@/lib/c-parser/c-types";
import { formatAddressRange, type AddressFormat } from "@/lib/memory/address-utils";
import type { CVariable } from "@/lib/memory/memory-types";

type VariableRowProps = {
  variable: CVariable;
  addressFormat: AddressFormat;
  selected: boolean;
  onSelect: (variable: CVariable) => void;
};

export function VariableRow({ variable, addressFormat, selected, onSelect }: VariableRowProps) {
  const address = formatAddressRange(variable.startAddress, variable.endAddress, addressFormat);
  const binary =
    variable.arrayLength === null ? formatVariableBinary(variable.type, variable.value, variable.sizeInBytes) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(variable)}
      className={`w-full px-3 py-1.5 text-left transition-colors hover:bg-muted ${selected ? "bg-muted" : ""}`}
      aria-pressed={selected}
    >
      <span className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: variable.stroke }} />
        <span className="font-mono text-xs font-medium text-foreground">{variable.name}</span>
        <span className="text-[11px] text-muted-foreground">{formatCType(variable.type, variable.arrayLength)}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {variable.sizeInBytes === 1 ? "1 byte" : `${variable.sizeInBytes} bytes`}
        </span>
      </span>
      <span className="mt-0.5 block pl-4 font-mono text-[11px] text-foreground">{address}</span>
      <span className="block pl-4 text-[11px] break-all text-muted-foreground">
        value: {variable.value === null ? "Uninitialized" : variable.value}
      </span>
      {binary ? (
        <span className="mt-0.5 block pl-4 font-mono text-[11px] leading-4 break-all whitespace-pre-wrap text-foreground">
          {binary}
        </span>
      ) : null}
    </button>
  );
}
