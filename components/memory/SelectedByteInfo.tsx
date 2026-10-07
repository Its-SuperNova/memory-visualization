"use client";

import { Separator } from "@/components/ui/separator";
import { formatHexAddress } from "@/lib/memory/address-utils";
import { BITS_PER_BYTE } from "@/lib/memory/memory-constants";

type SelectedByteInfoProps = {
  byteAddress: number | null;
  digits: number;
};

export function SelectedByteInfo({ byteAddress, digits }: SelectedByteInfoProps) {
  return (
    <section
      data-overlay
      aria-label="Selected byte"
      className="pointer-events-auto w-[220px] border border-border bg-background px-3 py-2.5"
    >
      <h2 className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">SELECTED BYTE</h2>
      {byteAddress === null ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Click a bit to select its byte.</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          <InfoRow label="Address" value={formatHexAddress(byteAddress, digits)} mono />
          <InfoRow label="Decimal Address" value={String(byteAddress)} mono />
          <Separator className="my-2 bg-border" />
          <InfoRow label="Size" value="1 Byte" />
          <InfoRow label="Bits" value={String(BITS_PER_BYTE)} mono />
          <InfoRow label="Bit Range" value="0–7" mono />
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
