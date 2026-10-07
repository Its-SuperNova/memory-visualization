"use client";

import { useEffect } from "react";

import { MemoryCanvas } from "@/components/memory/MemoryCanvas";
import { MemoryInfo } from "@/components/memory/MemoryInfo";
import { SelectedByteInfo } from "@/components/memory/SelectedByteInfo";
import { ViewToolbar } from "@/components/memory/ViewToolbar";
import { estimateLod, stepZoom, type MemoryLayout } from "@/lib/memory/geometry";
import type { CVariable, HoveredBit, MemoryModel, PanPosition, ViewportSize, WorkspaceTool } from "@/lib/memory/memory-types";

type MemoryGridProps = {
  model: MemoryModel;
  layout: MemoryLayout;
  pan: PanPosition;
  zoom: number;
  hoveredBit: HoveredBit | null;
  selectedByte: number | null;
  selectedVariableId: string | null;
  variables: readonly CVariable[];
  hexDigits: number;
  viewport: ViewportSize;
  onViewportChange: (viewport: ViewportSize) => void;
  onPanChange: (pan: PanPosition) => void;
  onHover: (bit: HoveredBit | null) => void;
  onSelectByte: (byteAddress: number) => void;
  onZoomAt: (screenX: number, screenY: number, nextZoom: number) => void;
  onFit: () => void;
  onClearSelection: () => void;
  tool: WorkspaceTool;
  onToolChange: (tool: WorkspaceTool) => void;
  editorOpen: boolean;
};

export function MemoryGrid({
  model,
  layout,
  pan,
  zoom,
  hoveredBit,
  selectedByte,
  selectedVariableId,
  variables,
  hexDigits,
  viewport,
  onViewportChange,
  onPanChange,
  onHover,
  onSelectByte,
  onZoomAt,
  onFit,
  onClearSelection,
  tool,
  onToolChange,
  editorOpen,
}: MemoryGridProps) {
  const coarse = estimateLod(layout, viewport) !== "bits";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            "button, a, input, textarea, select, [role='listbox'], [data-slot='select-trigger'], [data-slot='popover-content'], .monaco-editor",
          ))
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPanChange({ x: pan.x + 72, y: pan.y });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onPanChange({ x: pan.x - 72, y: pan.y });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        onPanChange({ x: pan.x, y: pan.y + 72 });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onPanChange({ x: pan.x, y: pan.y - 72 });
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        onZoomAt(viewport.width / 2, viewport.height / 2, stepZoom(zoom, 1));
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        onZoomAt(viewport.width / 2, viewport.height / 2, stepZoom(zoom, -1));
      } else if (event.key === "f" || event.key === "F" || event.key === "0") {
        event.preventDefault();
        onFit();
      } else if (event.key === "h" || event.key === "H") {
        onToolChange("hand");
      } else if (event.key === "v" || event.key === "V") {
        onToolChange("pointer");
      } else if (event.key === "Escape") {
        onClearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClearSelection, onFit, onPanChange, onToolChange, onZoomAt, pan.x, pan.y, viewport.height, viewport.width, zoom]);

  return (
    <div className="relative min-h-0 flex-1 bg-background">
      <MemoryCanvas
        layout={layout}
        pan={pan}
        zoom={zoom}
        hoveredBit={hoveredBit}
        selectedByte={selectedByte}
        selectedVariableId={selectedVariableId}
        variables={variables}
        hexDigits={hexDigits}
        onViewportChange={onViewportChange}
        onPanChange={onPanChange}
        onHover={onHover}
        onSelectByte={onSelectByte}
        onZoomAt={onZoomAt}
        tool={tool}
      />
      <ViewToolbar tool={tool} onToolChange={onToolChange} />
      {coarse ? (
        <p className="pointer-events-none absolute top-3 left-4 text-xs text-muted-foreground">
          Zoom in to inspect individual bits
        </p>
      ) : null}
      {editorOpen ? null : (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3">
          <SelectedByteInfo byteAddress={selectedByte} digits={hexDigits} />
          <MemoryInfo model={model} />
        </div>
      )}
    </div>
  );
}
