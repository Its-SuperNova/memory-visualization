"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/memory/memory-constants";

type ZoomControlsProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
};

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  const percent = Math.round(zoom * 100);
  const atMin = zoom <= MIN_ZOOM + 0.001;
  const atMax = zoom >= MAX_ZOOM - 0.001;

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="outline" size="icon-sm" aria-label="Zoom out" />}
          disabled={atMin}
          onClick={onZoomOut}
        >
          <Minus />
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>
      <span className="w-12 text-center font-mono text-xs text-foreground tabular-nums">{percent}%</span>
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="outline" size="icon-sm" aria-label="Zoom in" />}
          disabled={atMax}
          onClick={onZoomIn}
        >
          <Plus />
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="outline" size="sm" aria-label="Fit memory in view" className="ml-1" />}
          onClick={onFit}
        >
          Fit
        </TooltipTrigger>
        <TooltipContent>Fit memory in view</TooltipContent>
      </Tooltip>
    </div>
  );
}
