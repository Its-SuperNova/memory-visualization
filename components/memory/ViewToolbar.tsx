"use client";

import type { ReactNode } from "react";
import { Hand, MousePointer2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WorkspaceTool } from "@/lib/memory/memory-types";

type ViewToolbarProps = {
  tool: WorkspaceTool;
  onToolChange: (tool: WorkspaceTool) => void;
};

export function ViewToolbar({ tool, onToolChange }: ViewToolbarProps) {
  return (
    <div
      data-overlay
      role="toolbar"
      aria-label="Canvas tools"
      className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 border border-border bg-background p-1"
    >
      <ToolButton
        label="Pointer"
        description="Select a bit"
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
