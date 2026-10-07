"use client";

import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { MemorySizeSelector } from "@/components/memory/MemorySizeSelector";
import { ZoomControls } from "@/components/memory/ZoomControls";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CodeEditorButton } from "@/components/toolbar/CodeEditorButton";
import type { MemorySize } from "@/lib/memory/memory-types";

type MemoryToolbarProps = {
  memorySize: MemorySize;
  zoom: number;
  editorOpen: boolean;
  onMemorySizeChange: (size: MemorySize) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleEditor: () => void;
};

export function MemoryToolbar({
  memorySize,
  zoom,
  onMemorySizeChange,
  onZoomIn,
  onZoomOut,
  onFit,
  editorOpen,
  onToggleEditor,
}: MemoryToolbarProps) {
  return (
    <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">C Memory Visualizer</h1>
        <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
          Explore memory • bits • bytes • addresses
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <MemorySizeSelector value={memorySize} onChange={onMemorySizeChange} />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <ZoomControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} />
        <Separator orientation="vertical" className="hidden h-6 md:block" />
        <ThemeToggle />
        <CodeEditorButton open={editorOpen} onToggle={onToggleEditor} />
        <Popover>
          <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
            Guide
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <PopoverHeader>
              <PopoverTitle>How to read memory</PopoverTitle>
              <PopoverDescription>
                Every rectangle is one bit. Eight bits form one byte, and the address belongs to that byte.
              </PopoverDescription>
            </PopoverHeader>
            <Separator />
            <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
              <li>Bit 7 is the most significant bit, drawn on the left.</li>
              <li>Bit 0 is the least significant bit, drawn on the right.</li>
              <li>Each row is 10 bytes. Zoom in, then scroll right to reach the rest of the row.</li>
              <li>Open Code to declare variables and see the bytes they occupy.</li>
              <li>Use the pointer to hover and select a bit. Use the hand to drag the view.</li>
              <li>Scroll to move horizontally and vertically. Shift-scroll moves sideways.</li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
