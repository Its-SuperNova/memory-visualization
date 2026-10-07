"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { CodePanel } from "@/components/editor/CodePanel";
import { MemoryGrid } from "@/components/memory/MemoryGrid";
import { VariableVisualizer } from "@/components/memory/VariableVisualizer";
import { MemoryToolbar } from "@/components/memory/MemoryToolbar";
import { DEFAULT_C_PROGRAM } from "@/lib/c-parser/c-types";
import type { ParseIssue } from "@/lib/c-parser/c-types";
import { parseCVariables } from "@/lib/c-parser/variable-parser";
import { getAddressRange } from "@/lib/memory/address-utils";
import {
  clampPan,
  computeFitZoom,
  computeLayout,
  describeFocus,
  initialPan,
  panForFocus,
  panToAddressRange,
  stepZoom,
} from "@/lib/memory/geometry";
import { allocateVariables } from "@/lib/memory/memory-allocator";
import { DEFAULT_ZOOM } from "@/lib/memory/memory-constants";
import { createMemoryModel, memorySizeToBytes, variableAtAddress, variableToAllocation } from "@/lib/memory/memory-utils";
import type { CVariable, HoveredBit, MemorySize, PanPosition, ViewportSize, WorkspaceTool } from "@/lib/memory/memory-types";

const EMPTY_VIEWPORT: ViewportSize = { width: 0, height: 0 };
type CompactTab = "memory" | "code" | "variables";

export function MemoryVisualizer() {
  const [memorySize, setMemorySize] = useState<MemorySize>("1KB");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState<ViewportSize>(EMPTY_VIEWPORT);
  const [hoveredBit, setHoveredBit] = useState<HoveredBit | null>(null);
  const [selectedByte, setSelectedByte] = useState<number | null>(null);
  const [selectedVariableId, setSelectedVariableId] = useState<string | null>(null);
  const [visualizerVariableId, setVisualizerVariableId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [tool, setTool] = useState<WorkspaceTool>("pointer");
  const [editorOpen, setEditorOpen] = useState(false);
  const [compactTab, setCompactTab] = useState<CompactTab>("memory");
  const [code, setCode] = useState(DEFAULT_C_PROGRAM);
  const [variables, setVariables] = useState<CVariable[]>([]);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const model = useMemo(
    () => createMemoryModel(memorySize, variables.map(variableToAllocation)),
    [memorySize, variables],
  );
  const layout = useMemo(
    () => computeLayout(Math.max(viewport.width, 1), zoom, model.sizeInBytes),
    [viewport.width, zoom, model.sizeInBytes],
  );
  const addressRange = useMemo(() => getAddressRange(model.sizeInBytes), [model.sizeInBytes]);

  const viewRef = useRef({
    zoom,
    pan,
    viewport,
    layout,
    totalBytes: model.sizeInBytes,
  });

  useLayoutEffect(() => {
    viewRef.current = { zoom, pan, viewport, layout, totalBytes: model.sizeInBytes };
  }, [zoom, pan, viewport, layout, model.sizeInBytes]);

  const needsInitialPan = useRef(true);
  const previousViewport = useRef(viewport);
  const variablesRef = useRef(variables);
  const analyzedRef = useRef(false);
  const seedRef = useRef(0);

  useEffect(() => {
    if (!editorOpen && !analyzedRef.current) return;
    const delay = analyzedRef.current ? 400 : 0;
    const timer = window.setTimeout(() => {
      if (seedRef.current === 0) {
        seedRef.current = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
      }
      const parsed = parseCVariables(code);
      const allocated = allocateVariables(parsed.variables, memorySizeToBytes(memorySize), variablesRef.current, seedRef.current);
      analyzedRef.current = true;
      variablesRef.current = allocated.variables;
      setVariables(allocated.variables);
      setIssues(parsed.issues);
      setAllocationError(allocated.error);
      setSelectedVariableId((current) =>
        current && allocated.variables.some((variable) => variable.id === current) ? current : null,
      );
      setVisualizerVariableId((current) =>
        current && allocated.variables.some((variable) => variable.id === current) ? current : null,
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [code, editorOpen, memorySize]);

  const onViewportChange = useCallback((next: ViewportSize) => {
    setViewport((current) =>
      current.width === next.width && current.height === next.height ? current : next,
    );
  }, []);

  const onHover = useCallback((bit: HoveredBit | null) => {
    setHoveredBit((current) => (current?.bitIndex === bit?.bitIndex ? current : bit));
  }, []);

  const centerVariable = useCallback((variable: CVariable) => {
    const current = viewRef.current;
    if (current.viewport.width === 0) return;
    const nextZoom = Math.max(current.zoom, 1);
    const zoomChanged = nextZoom !== current.zoom;
    const nextLayout = zoomChanged
      ? computeLayout(current.viewport.width, nextZoom, current.totalBytes)
      : current.layout;
    const next = panToAddressRange(variable.startAddress, variable.endAddress, nextLayout, current.viewport);
    current.zoom = nextZoom;
    current.layout = nextLayout;
    current.pan = next;
    if (zoomChanged) setZoom(nextZoom);
    setPan(next);
  }, []);

  const onSelectByte = useCallback((byteAddress: number) => {
    setSelectedByte(byteAddress);
    const variable = variableAtAddress(variablesRef.current, byteAddress);
    setSelectedVariableId(variable?.id ?? null);
    if (variable) setFocusToken((token) => token + 1);
  }, []);

  const onSelectVariable = useCallback(
    (variable: CVariable) => {
      setSelectedVariableId(variable.id);
      setSelectedByte(variable.startAddress);
      setFocusToken((token) => token + 1);
      setVisualizerVariableId((current) => (current ? variable.id : null));
      centerVariable(variable);
    },
    [centerVariable],
  );

  const onToggleVisualizer = useCallback((variable: CVariable) => {
    setVisualizerVariableId((current) => (current === variable.id ? null : variable.id));
  }, []);

  const onShowAllVariables = useCallback(() => {
    setVisualizerVariableId(null);
    setSelectedByte(null);
    setSelectedVariableId(null);
  }, []);

  const onSelectLine = useCallback(
    (lineNumber: number, column: number) => {
      const onLine = variablesRef.current.filter((variable) => variable.lineNumber === lineNumber);
      const variable =
        onLine.find((item) => column >= item.column && column <= item.endColumn) ??
        (onLine.length === 1 ? onLine[0] : undefined);
      if (!variable) return;
      setSelectedVariableId(variable.id);
      setSelectedByte(variable.startAddress);
      centerVariable(variable);
    },
    [centerVariable],
  );

  const onClearSelection = useCallback(() => {
    setSelectedByte(null);
    setSelectedVariableId(null);
  }, []);

  const onToggleEditor = useCallback(() => {
    setEditorOpen((open) => {
      const next = !open;
      if (next) {
        setCompactTab("code");
      } else {
        setCompactTab("memory");
      }
      return next;
    });
  }, []);

  const onCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setCompactTab("memory");
    setVisualizerVariableId(null);
  }, []);

  const applyPan = useCallback((next: PanPosition) => {
    const current = viewRef.current;
    const clamped = clampPan(next, current.layout, current.viewport);
    current.pan = clamped;
    setPan(clamped);
  }, []);

  const onZoomAt = useCallback((screenX: number, screenY: number, nextZoom: number) => {
    const current = viewRef.current;
    if (current.viewport.width === 0) return;
    if (Math.abs(nextZoom - current.zoom) < 0.0005) return;

    const focus = describeFocus(screenX, screenY, current.pan, current.layout);
    const nextLayout = computeLayout(current.viewport.width, nextZoom, current.totalBytes);
    const nextPan = clampPan(
      panForFocus(focus, screenX, screenY, nextLayout),
      nextLayout,
      current.viewport,
    );

    current.zoom = nextZoom;
    current.pan = nextPan;
    current.layout = nextLayout;
    setZoom(nextZoom);
    setPan(nextPan);
  }, []);

  const onZoomIn = useCallback(() => {
    const current = viewRef.current;
    onZoomAt(current.viewport.width / 2, current.viewport.height / 2, stepZoom(current.zoom, 1));
  }, [onZoomAt]);

  const onZoomOut = useCallback(() => {
    const current = viewRef.current;
    onZoomAt(current.viewport.width / 2, current.viewport.height / 2, stepZoom(current.zoom, -1));
  }, [onZoomAt]);

  const onFit = useCallback(() => {
    const current = viewRef.current;
    if (current.viewport.width === 0 || current.viewport.height === 0) return;
    const nextZoom = computeFitZoom(current.viewport, current.totalBytes);
    const nextLayout = computeLayout(current.viewport.width, nextZoom, current.totalBytes);
    const nextPan = initialPan(nextLayout, current.viewport);
    current.zoom = nextZoom;
    current.pan = nextPan;
    current.layout = nextLayout;
    setZoom(nextZoom);
    setPan(nextPan);
  }, []);

  const onMemorySizeChange = useCallback((size: MemorySize) => {
    setMemorySize(size);
    setHoveredBit(null);
    setSelectedByte((current) => {
      if (current === null) return null;
      return current < memorySizeToBytes(size) ? current : null;
    });
    needsInitialPan.current = true;
  }, []);

  useLayoutEffect(() => {
    if (viewport.width === 0 || viewport.height === 0 || !needsInitialPan.current) return;
    const next = initialPan(layout, viewport);
    needsInitialPan.current = false;
    viewRef.current.pan = next;
    setPan(next);
  }, [layout, viewport]);

  useLayoutEffect(() => {
    if (viewport.width === 0 || viewport.height === 0) return;
    const previous = previousViewport.current;
    previousViewport.current = viewport;
    if (previous.width === 0 || needsInitialPan.current) return;
    if (previous.width === viewport.width && previous.height === viewport.height) return;

    const current = viewRef.current;
    const oldLayout = computeLayout(previous.width, current.zoom, current.totalBytes);
    const focus = describeFocus(previous.width / 2, previous.height / 2, current.pan, oldLayout);
    const nextLayout = computeLayout(viewport.width, current.zoom, current.totalBytes);
    const next = clampPan(
      panForFocus(focus, viewport.width / 2, viewport.height / 2, nextLayout),
      nextLayout,
      viewport,
    );
    current.pan = next;
    current.layout = nextLayout;
    setPan(next);
  }, [viewport]);

  const visualizedVariable = variables.find((variable) => variable.id === visualizerVariableId) ?? null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <MemoryToolbar
        memorySize={memorySize}
        zoom={zoom}
        editorOpen={editorOpen}
        onMemorySizeChange={onMemorySizeChange}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFit={onFit}
        onToggleEditor={onToggleEditor}
      />
      {editorOpen ? (
        <div className="flex shrink-0 border-b border-border lg:hidden" role="tablist" aria-label="Workspace">
          {(["memory", "code", "variables"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={compactTab === tab}
              className={`h-8 flex-1 text-xs capitalize ${compactTab === tab ? "text-foreground" : "text-muted-foreground"}`}
              onClick={() => setCompactTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`flex min-h-0 min-w-0 flex-col ${
            editorOpen ? "w-full lg:w-[70%] lg:shrink-0" : "flex-1"
          } ${editorOpen && compactTab !== "memory" ? "max-lg:hidden" : ""}`}
        >
            {visualizedVariable ? (
              <VariableVisualizer variable={visualizedVariable} digits={addressRange.digits} />
            ) : (
              <MemoryGrid
                model={model}
                layout={layout}
                pan={pan}
                zoom={zoom}
                hoveredBit={hoveredBit}
                selectedByte={selectedByte}
                selectedVariableId={selectedVariableId}
                variables={variables}
                hexDigits={addressRange.digits}
                viewport={viewport}
                onViewportChange={onViewportChange}
                onPanChange={applyPan}
                onHover={onHover}
                onSelectByte={onSelectByte}
                onZoomAt={onZoomAt}
                onFit={onFit}
                onClearSelection={onClearSelection}
                tool={tool}
                onToolChange={setTool}
                editorOpen={editorOpen}
              />
            )}
          </div>
        {editorOpen ? (
          <div
            className={`h-full min-w-0 lg:w-[30%] lg:shrink-0 ${
              compactTab === "memory" ? "max-lg:hidden" : "w-full flex-1"
            }`}
          >
            <CodePanel
              compactTab={compactTab}
              code={code}
              variables={variables}
              issues={issues}
              allocationError={allocationError}
              digits={addressRange.digits}
              selectedVariableId={selectedVariableId}
              focusToken={focusToken}
              onCodeChange={setCode}
              onSelectLine={onSelectLine}
              onSelectVariable={onSelectVariable}
              onShowAllVariables={onShowAllVariables}
              onClose={onCloseEditor}
              visualizerVariableId={visualizerVariableId}
              onToggleVisualizer={onToggleVisualizer}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
