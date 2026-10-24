"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const VISUALIZERS = [
  { id: "memory", label: "C Memory Visualizer", href: "/" },
  { id: "loop", label: "Loop Visualizer", href: "/loop" },
] as const;

export type VisualizerId = (typeof VISUALIZERS)[number]["id"];

export function VisualizerSwitcher({ current }: { current: VisualizerId }) {
  const [open, setOpen] = useState(false);
  const active = VISUALIZERS.find((item) => item.id === current) ?? VISUALIZERS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Switch visualizer"
        className="-mx-1.5 flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left hover:bg-muted"
      >
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">{active.label}</h1>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0.5 p-1">
        <nav aria-label="Visualizers" className="flex flex-col gap-0.5">
          {VISUALIZERS.map((item) => {
            const selected = item.id === current;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ${
                  selected ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
                {selected ? <Check className="size-3.5" /> : null}
              </Link>
            );
          })}
        </nav>
      </PopoverContent>
    </Popover>
  );
}
