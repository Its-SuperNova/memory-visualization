"use client";

import type { RefObject } from "react";

import { formatHexAddress } from "@/lib/memory/address-utils";
import { variableAtAddress } from "@/lib/memory/memory-utils";
import type { CVariable, HoveredBit } from "@/lib/memory/memory-types";

type MemoryTooltipProps = {
  bit: HoveredBit | null;
  digits: number;
  variables: readonly CVariable[];
  tooltipRef: RefObject<HTMLDivElement | null>;
};

export function MemoryTooltip({ bit, digits, variables, tooltipRef }: MemoryTooltipProps) {
  if (!bit) return null;
  const variable = variableAtAddress(variables, bit.byteAddress);

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="pointer-events-none fixed top-0 left-0 z-40 w-48 border border-border bg-background px-3 py-2.5 will-change-transform"
    >
      {variable ? (
        <>
          <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: variable.stroke }} />
            VARIABLE
          </p>
          <dl className="mt-2 space-y-1.5">
            <Field label="Variable" value={variable.name} />
            <Field label="Type" value={variable.type} />
            <Field label="Memory Address" value={formatHexAddress(bit.byteAddress, digits)} />
            <Field label="Bit Position" value={String(bit.bitPosition)} />
            <Field
              label="Byte"
              value={`${bit.byteAddress - variable.startAddress + 1} of ${variable.sizeInBytes}`}
            />
            <Field label="Total Size" value={formatByteSize(variable.sizeInBytes)} />
          </dl>
        </>
      ) : (
        <>
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">BIT</p>
          <dl className="mt-2 space-y-1.5">
            <Field label="Memory Address" value={formatHexAddress(bit.byteAddress, digits)} />
            <Field label="Bit Position" value={String(bit.bitPosition)} />
            <Field label="Status" value="Available" />
            <Field label="Size" value="1 Byte" />
          </dl>
        </>
      )}
    </div>
  );
}

function formatByteSize(bytes: number): string {
  return bytes === 1 ? "1 Byte" : `${bytes} Bytes`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs text-foreground">{value}</dd>
    </div>
  );
}

export function placeTooltip(element: HTMLElement, clientX: number, clientY: number): void {
  const offset = 16;
  const rect = element.getBoundingClientRect();
  const width = rect.width || 192;
  const height = rect.height || 180;
  let left = clientX + offset;
  let top = clientY + offset;
  if (left + width > window.innerWidth - 8) left = clientX - width - offset;
  if (top + height > window.innerHeight - 8) top = clientY - height - offset;
  element.style.transform = `translate3d(${Math.max(8, left)}px, ${Math.max(8, top)}px, 0)`;
}
