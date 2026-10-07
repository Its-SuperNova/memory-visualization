"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAddressRange } from "@/lib/memory/address-utils";
import { formatInteger, formatMemorySize } from "@/lib/memory/memory-utils";
import type { MemoryModel } from "@/lib/memory/memory-types";

type MemoryInfoProps = {
  model: MemoryModel;
};

export function MemoryInfo({ model }: MemoryInfoProps) {
  const range = getAddressRange(model.sizeInBytes);

  return (
    <section
      data-overlay
      aria-label="Memory summary"
      className="pointer-events-auto w-[220px] border border-border bg-background px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">MEMORY</h2>
        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
          1 byte = 8 bits
        </Badge>
      </div>
      <p className="mt-2 font-mono text-sm text-foreground">{formatMemorySize(model.sizeInBytes)}</p>
      <p className="mt-1 font-mono text-xs text-foreground">{formatInteger(model.sizeInBytes)} Bytes</p>
      <p className="mt-0.5 font-mono text-xs text-foreground">{formatInteger(model.totalBits)} Bits</p>
      <Separator className="my-2.5 bg-border" />
      <h3 className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">ADDRESS RANGE</h3>
      <p className="mt-1.5 font-mono text-xs text-foreground">{range.label}</p>
    </section>
  );
}
