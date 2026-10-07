"use client";

import { Code2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CodeEditorButtonProps = {
  open: boolean;
  onToggle: () => void;
};

export function CodeEditorButton({ open, onToggle }: CodeEditorButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={open ? "default" : "outline"}
            size="sm"
            aria-pressed={open}
            aria-label="Open C Code Editor"
          />
        }
        onClick={onToggle}
      >
        <Code2 />
        Code
      </TooltipTrigger>
      <TooltipContent>Open C Code Editor</TooltipContent>
    </Tooltip>
  );
}
