"use client";

import { Separator } from "@/components/ui/separator";
import { formatAddress, type AddressFormat } from "@/lib/memory/address-utils";
import { BITS_PER_BYTE } from "@/lib/memory/memory-constants";
import type { MemoryUnit } from "@/lib/memory/memory-types";

type SelectedByteInfoProps = {
  byteAddress: number | null;
  addressFormat: AddressFormat;
  unit: MemoryUnit;
};

export function SelectedByteInfo({ byteAddress, addressFormat, unit }: SelectedByteInfoProps) {
  const hex = addressFormat.base === "hex";
  return (
    <section
      data-overlay
      aria-label="Selected byte"
      className="pointer-events-auto w-[220px] border border-border bg-background px-3 py-2.5"
    >
      <h2 className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">SELECTED BYTE</h2>
      {byteAddress === null ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {unit === "bits" ? "Click a bit to select its byte." : "Click a byte to select it."}
        </p>
      ) : (
        <div className="mt-2 space-y-1.5">
          <InfoRow label="Address" value={formatAddress(byteAddress, addressFormat)} mono />
          <InfoRow
            label={hex ? "Decimal Address" : "Hex Address"}
            value={formatAddress(byteAddress, { ...addressFormat, base: hex ? "decimal" : "hex" })}
            mono
          />
          <Separator className="my-2 bg-border" />
          <InfoRow label="Size" value="1 Byte" />
          {unit === "bits" ? (
            <>
              <InfoRow label="Bits" value={String(BITS_PER_BYTE)} mono />
              <InfoRow label="Bit Range" value="0–7" mono />
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs text-foreground" : "text-xs text-foreground"}>{value}</span>
    </div>
  );
}
