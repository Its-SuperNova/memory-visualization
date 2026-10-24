import type { Metadata } from "next";

import { LoopVisualizer } from "@/components/loop/LoopVisualizer";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { VisualizerSwitcher } from "@/components/toolbar/VisualizerSwitcher";

export const metadata: Metadata = {
  title: "For Loop Visualizer",
  description: "See how the for loop works step by step.",
};

export default function LoopPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4">
        <div className="min-w-0">
          <VisualizerSwitcher current="loop" />
          <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
            Step through loops • iterations • conditions
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
        </div>
      </header>
      <main className="minimal-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <LoopVisualizer />
      </main>
    </div>
  );
}
