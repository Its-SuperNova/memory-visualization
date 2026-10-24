"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { MemoryTooltip, placeTooltip } from "@/components/memory/MemoryTooltip";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { AddressFormat } from "@/lib/memory/address-utils";
import { drawMemory } from "@/lib/memory/draw-memory";
import { clampPan, hitTest, wheelZoom, type MemoryLayout } from "@/lib/memory/geometry";
import type { CVariable, HoveredBit, PanPosition, ViewportSize, WorkspaceTool } from "@/lib/memory/memory-types";

type MemoryCanvasProps = {
  layout: MemoryLayout;
  pan: PanPosition;
  zoom: number;
  hoveredBit: HoveredBit | null;
  selectedByte: number | null;
  selectedVariableId: string | null;
  variables: readonly CVariable[];
  addressFormat: AddressFormat;
  onViewportChange: (viewport: ViewportSize) => void;
  onPanChange: (pan: PanPosition) => void;
  onHover: (bit: HoveredBit | null) => void;
  onSelectByte: (byteAddress: number) => void;
  onZoomAt: (screenX: number, screenY: number, nextZoom: number) => void;
  tool: WorkspaceTool;
  mergeBytes: boolean;
};

const DRAG_THRESHOLD = 4;

export function MemoryCanvas({
  layout,
  pan,
  zoom,
  hoveredBit,
  selectedByte,
  selectedVariableId,
  variables,
  addressFormat,
  onViewportChange,
  onPanChange,
  onHover,
  onSelectByte,
  onZoomAt,
  tool,
  mergeBytes,
}: MemoryCanvasProps) {
  const { palette } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const fontRef = useRef("ui-monospace, monospace");
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
    tool: WorkspaceTool;
  } | null>(null);
  const toolRef = useRef(tool);
  const gestureRef = useRef(false);
  const wheelTimerRef = useRef(0);

  const viewRef = useRef({
    layout,
    pan,
    zoom,
    hoveredBit,
    selectedByte,
    selectedVariableId,
    variables,
    addressFormat,
    mergeBytes,
    colors: palette,
  });
  const callbacksRef = useRef({ onPanChange, onHover, onSelectByte, onZoomAt });
  const panByRef = useRef<(dx: number, dy: number) => void>(() => {});

  const paint = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bitmapWidth = Math.max(1, Math.floor(width * dpr));
    const bitmapHeight = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (fontRef.current === "ui-monospace, monospace") {
      fontRef.current = getComputedStyle(canvas).fontFamily || fontRef.current;
    }

    const view = viewRef.current;
    drawMemory(context, width, height, view.layout, {
      pan: view.pan,
      hoveredBitIndex: view.hoveredBit?.bitIndex ?? null,
      selectedByte: view.selectedByte,
      selectedVariableId: view.selectedVariableId,
      variables: view.variables,
      addressFormat: view.addressFormat,
      mergeBytes: view.mergeBytes,
      fontFamily: fontRef.current,
      colors: view.colors,
    });
  };

  useLayoutEffect(() => {
    callbacksRef.current = { onPanChange, onHover, onSelectByte, onZoomAt };
    toolRef.current = tool;
    panByRef.current = (dx, dy) => {
      gestureRef.current = true;
      const container = containerRef.current;
      viewRef.current.pan = clampPan(
        { x: viewRef.current.pan.x - dx, y: viewRef.current.pan.y - dy },
        viewRef.current.layout,
        { width: container?.clientWidth ?? 0, height: container?.clientHeight ?? 0 },
      );
      paint();
      window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => {
        gestureRef.current = false;
        callbacksRef.current.onPanChange(viewRef.current.pan);
      }, 60);
    };
  }, [onPanChange, onHover, onSelectByte, onZoomAt, tool]);

  useLayoutEffect(() => {
    const dragging = dragRef.current?.moved === true || gestureRef.current;
    viewRef.current = {
      layout,
      zoom,
      hoveredBit,
      selectedByte,
      selectedVariableId,
      variables,
      addressFormat,
      mergeBytes,
      colors: palette,
      pan: dragging ? viewRef.current.pan : pan,
    };
    paint();
  }, [layout, pan, zoom, hoveredBit, selectedByte, selectedVariableId, variables, addressFormat, mergeBytes, palette]);

  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!element || !hoveredBit) return;
    placeTooltip(element, pointerRef.current.x, pointerRef.current.y);
  }, [hoveredBit, addressFormat]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const publish = () => {
      onViewportChange({ width: container.clientWidth, height: container.clientHeight });
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(container);
    return () => observer.disconnect();
  }, [onViewportChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      if (isOverlayTarget(event.target)) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1;
      if (event.ctrlKey || event.metaKey) {
        const rect = container.getBoundingClientRect();
        callbacksRef.current.onZoomAt(
          event.clientX - rect.left,
          event.clientY - rect.top,
          wheelZoom(viewRef.current.zoom, event.deltaY * (event.deltaMode === 1 ? 16 : 1)),
        );
        return;
      }
      let dx = event.deltaX * scale;
      let dy = event.deltaY * scale;
      if (event.shiftKey && Math.abs(dx) < Math.abs(dy)) {
        dx = dy;
        dy = 0;
      }
      panByRef.current(dx, dy);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelTimerRef.current);
    };
  }, []);

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div
      ref={containerRef}
      role="application"
      tabIndex={0}
      aria-label="Memory workspace. Scroll to move the view. Use the hand to drag, and the pointer to select a bit."
      className={`relative h-full min-h-0 w-full touch-none overflow-hidden select-none outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#2D37FF] ${
        tool === "hand" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
      onPointerDown={(event) => {
        if (event.button !== 0 || isOverlayTarget(event.target)) return;
        const point = localPoint(event);
        dragRef.current = {
          pointerId: event.pointerId,
          startX: point.x,
          startY: point.y,
          panX: viewRef.current.pan.x,
          panY: viewRef.current.pan.y,
          moved: false,
          tool: toolRef.current,
        };
        if (event.currentTarget.hasPointerCapture?.(event.pointerId) === false) {
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Capture is only available for a real active pointer.
          }
        }
        event.currentTarget.focus();
      }}
      onPointerMove={(event) => {
        pointerRef.current = { x: event.clientX, y: event.clientY };
        const drag = dragRef.current;
        const point = localPoint(event);

        if (drag && drag.pointerId === event.pointerId) {
          const dx = point.x - drag.startX;
          const dy = point.y - drag.startY;
          if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
            drag.moved = true;
            callbacksRef.current.onHover(null);
          }
          if (drag.moved && drag.tool === "hand") {
            gestureRef.current = true;
            const container = containerRef.current;
            const width = container?.clientWidth ?? 0;
            const height = container?.clientHeight ?? 0;
            viewRef.current.pan = clampPan(
              { x: drag.panX + dx, y: drag.panY + dy },
              viewRef.current.layout,
              { width, height },
            );
            paint();
            return;
          }
        }

        if (tooltipRef.current && hoveredBit) {
          placeTooltip(tooltipRef.current, event.clientX, event.clientY);
        }

        const hit = hitTest(point.x, point.y, viewRef.current.pan, viewRef.current.layout);
        callbacksRef.current.onHover(hit);
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          try {
            event.currentTarget.releasePointerCapture(event.pointerId);
          } catch {
            // The pointer may already have been released.
          }
        }
        gestureRef.current = false;
        if (drag.tool === "hand") {
          if (drag.moved) callbacksRef.current.onPanChange(viewRef.current.pan);
          return;
        }
        if (!drag.moved) {
          const point = localPoint(event);
          const hit = hitTest(point.x, point.y, viewRef.current.pan, viewRef.current.layout);
          if (hit) callbacksRef.current.onSelectByte(hit.byteAddress);
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onPointerLeave={() => {
        if (dragRef.current?.moved) return;
        callbacksRef.current.onHover(null);
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 font-mono" />
      <MemoryTooltip
        unit={layout.unit}
        bit={hoveredBit}
        addressFormat={addressFormat}
        variables={variables}
        tooltipRef={tooltipRef}
      />
    </div>
  );
}

function isOverlayTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-overlay]"));
}
