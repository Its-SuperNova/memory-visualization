"use client";

import type { ReactNode } from "react";
import { Combine, Hand, MousePointer2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MemoryUnit, WorkspaceTool } from "@/lib/memory/memory-types";

type ViewToolbarProps = {
  tool: WorkspaceTool;
  unit: MemoryUnit;
  mergeBytes: boolean;
  onToolChange: (tool: WorkspaceTool) => void;
  onMergeBytesChange: (merge: boolean) => void;
};

export function ViewToolbar({ tool, unit, mergeBytes, onToolChange, onMergeBytesChange }: ViewToolbarProps) {
  return (
    <div
      data-overlay
      role="toolbar"
      aria-label="Canvas tools"
      className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 border border-border bg-background p-1"
    >
      <ToolButton
        label="Pointer"
        description={unit === "bits" ? "Select a bit" : "Select a byte"}
        active={tool === "pointer"}
        onClick={() => onToolChange("pointer")}
      >
        <MousePointer2 />
      </ToolButton>
      <ToolButton
        label="Hand"
        description="Move the view"
        active={tool === "hand"}
        onClick={() => onToolChange("hand")}
      >
        <Hand />
      </ToolButton>
      {unit === "bytes" ? (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          <ToolButton
            label="Merge bytes"
            description={
              mergeBytes
                ? "Show every byte as its own box"
                : "Join the bytes of each variable or array element into one box with its value"
            }
            active={mergeBytes}
            onClick={() => onMergeBytesChange(!mergeBytes)}
          >
            <Combine />
          </ToolButton>
        </>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  description,
  active,
  onClick,
  children,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "default" : "ghost"}
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
          />
        }
        onClick={onClick}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}. {description}
      </TooltipContent>
    </Tooltip>
  );
}
