import type { ParsedVariable } from "@/lib/c-parser/c-types";
import type { CVariable } from "@/lib/memory/memory-types";
import { VARIABLE_COLORS, variableColor, variableColorIndex } from "@/lib/memory/variable-colors";

export type AllocationResult = {
  variables: CVariable[];
  error: string | null;
};

type Interval = {
  start: number;
  end: number;
};

export function allocateVariables(
  parsed: readonly ParsedVariable[],
  memorySize: number,
  previous: readonly CVariable[],
  seed: number,
): AllocationResult {
  const previousByName = new Map(previous.map((variable) => [variable.name, variable]));
  const kept: CVariable[] = [];
  const pending: ParsedVariable[] = [];
  const occupied: Interval[] = [];

  for (const variable of parsed) {
    const existing = previousByName.get(variable.name);
    const keptVariable = existing ? reuseAllocation(variable, existing, memorySize, occupied) : null;
    if (keptVariable) {
      kept.push(keptVariable);
      occupied.push({ start: keptVariable.startAddress, end: keptVariable.endAddress });
    } else {
      pending.push(variable);
    }
  }

  const usedColors = new Set(kept.map((variable) => variableColorIndex(variable.colorId)));
  const created: CVariable[] = [];
  const failed: string[] = [];

  for (const variable of pending) {
    const start = findStart(variable.sizeInBytes, memorySize, occupied, hashMix(seed, variable.name));
    if (start === null) {
      failed.push(variable.name);
      continue;
    }
    const color = takeColor(usedColors);
    const placed = toVariable(variable, start, color.id, color.fill, color.selectedFill, color.stroke);
    created.push(placed);
    occupied.push({ start: placed.startAddress, end: placed.endAddress });
  }

  const variables = [...kept, ...created].sort((a, b) => a.lineNumber - b.lineNumber || a.column - b.column);

  return {
    variables,
    error: failed.length > 0 ? "Not enough memory available." : null,
  };
}

function reuseAllocation(
  variable: ParsedVariable,
  existing: CVariable,
  memorySize: number,
  occupied: readonly Interval[],
): CVariable | null {
  const start = existing.startAddress;
  const end = start + variable.sizeInBytes - 1;
  if (variable.sizeInBytes <= 0 || end >= memorySize || start < 0) return null;
  if (occupied.some((interval) => overlaps(interval.start, interval.end, start, end))) return null;
  return {
    ...existing,
    type: variable.type,
    value: variable.value,
    sizeInBytes: variable.sizeInBytes,
    endAddress: end,
    lineNumber: variable.lineNumber,
    column: variable.column,
    endColumn: variable.endColumn,
  };
}

function toVariable(
  variable: ParsedVariable,
  start: number,
  colorId: string,
  fill: string,
  selectedFill: string,
  stroke: string,
): CVariable {
  return {
    id: `var:${variable.name}`,
    name: variable.name,
    type: variable.type,
    value: variable.value,
    sizeInBytes: variable.sizeInBytes,
    startAddress: start,
    endAddress: start + variable.sizeInBytes - 1,
    lineNumber: variable.lineNumber,
    column: variable.column,
    endColumn: variable.endColumn,
    colorId,
    fill,
    selectedFill,
    stroke,
  };
}

function takeColor(used: Set<number>) {
  for (let index = 0; index < VARIABLE_COLORS.length; index += 1) {
    if (!used.has(index)) {
      used.add(index);
      return variableColor(index);
    }
  }
  const index = used.size % VARIABLE_COLORS.length;
  used.add(used.size);
  return variableColor(index);
}

function findStart(size: number, memorySize: number, occupied: readonly Interval[], hash: number): number | null {
  if (size <= 0 || size > memorySize) return null;
  const aligned = scanStarts(size, memorySize, occupied, hash, Math.min(size, 8));
  if (aligned !== null) return aligned;
  if (size === 1) return null;
  return scanStarts(size, memorySize, occupied, hash, 1);
}

function scanStarts(
  size: number,
  memorySize: number,
  occupied: readonly Interval[],
  hash: number,
  step: number,
): number | null {
  const last = memorySize - size;
  const count = Math.floor(last / step) + 1;
  if (count <= 0) return null;
  const origin = hash % count;
  for (let offset = 0; offset < count; offset += 1) {
    const start = ((origin + offset) % count) * step;
    const end = start + size - 1;
    if (!occupied.some((interval) => overlaps(interval.start, interval.end, start, end))) return start;
  }
  return null;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA <= endB && startB <= endA;
}

function hashMix(seed: number, name: string): number {
  let hash = seed >>> 0;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
