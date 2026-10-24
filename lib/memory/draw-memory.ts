import { elementBitString, elementValue } from "@/lib/c-parser/binary-value";
import { formatAddress, type AddressFormat } from "@/lib/memory/address-utils";
import { BITS_PER_BYTE, type MemoryPalette } from "@/lib/memory/memory-constants";
import { bitIndexToByteAddress } from "@/lib/memory/memory-utils";
import {
  byteOrigin,
  chooseLod,
  visibleRange,
  type MemoryLayout,
} from "@/lib/memory/geometry";
import type { CVariable, PanPosition } from "@/lib/memory/memory-types";

export type MemoryDrawState = {
  pan: PanPosition;
  hoveredBitIndex: number | null;
  selectedByte: number | null;
  selectedVariableId: string | null;
  variables: readonly CVariable[];
  addressFormat: AddressFormat;
  /** Bytes view only: draw each variable or array element as one box with its value. */
  mergeBytes: boolean;
  fontFamily: string;
  colors: MemoryPalette;
};

export function drawMemory(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layout: MemoryLayout,
  state: MemoryDrawState,
): void {
  ctx.clearRect(0, 0, width, height);
  const colors = state.colors;
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  if (width <= 0 || height <= 0 || layout.totalBytes === 0) return;

  const range = visibleRange(layout, state.pan, width, height);
  if (range.endRow < range.startRow || range.endCol < range.startCol) return;

  const lod = chooseLod(layout, range.visibleBytes);
  const bytesView = layout.unit === "bytes";
  const hoveredByte =
    state.hoveredBitIndex === null ? null : bitIndexToByteAddress(state.hoveredBitIndex);
  const hoveredSlot =
    state.hoveredBitIndex === null ? null : state.hoveredBitIndex % BITS_PER_BYTE;

  if (lod === "rows") {
    drawRowBands(ctx, layout, state.pan, range, colors);
  } else if (lod === "bytes") {
    drawByteBlocks(ctx, layout, state.pan, range, hoveredByte, state.selectedByte, colors);
  } else {
    drawBitGrid(ctx, layout, state.pan, range, hoveredByte, state.selectedByte, colors);
  }

  const nameChips = drawAllocations(ctx, layout, state, range, lod, hoveredByte);

  const hoveredVariable = hoveredByte === null ? null : variableAt(state.variables, hoveredByte);
  const selectedVariableByte =
    state.selectedByte !== null && variableAt(state.variables, state.selectedByte) !== null;
  if (hoveredByte !== null && hoveredByte !== state.selectedByte && hoveredVariable === null) {
    drawByteHighlight(ctx, layout, state.pan, hoveredByte, "hover", colors);
  }
  if (state.selectedByte !== null && !selectedVariableByte) {
    drawByteHighlight(ctx, layout, state.pan, state.selectedByte, "selected", colors);
  }
  if (!bytesView && hoveredByte !== null && hoveredSlot !== null) {
    drawBitMarker(ctx, layout, state.pan, hoveredByte, hoveredSlot, colors);
  }

  const detailed = lod === "bits" || (bytesView && lod === "bytes");
  if (detailed && (layout.showAddress || layout.showBitPositions)) {
    drawLabels(ctx, layout, state, range, hoveredByte);
  }
  if (lod === "bits") {
    drawSelectedValueBits(ctx, layout, state, range);
  }
  for (const chip of nameChips) {
    drawVariableName(ctx, chip.label, chip.x, chip.y, chip.width, chip.stroke, colors.background, state.fontFamily);
  }
}

type NameChip = { label: string; x: number; y: number; width: number; stroke: string };

function elementLabel(variable: CVariable, index: number): string {
  if (variable.arrayLength === null) return variable.name;
  return index === 0 ? `${variable.name}[0]` : `[${index}]`;
}

function variableAt(variables: readonly CVariable[], address: number): CVariable | null {
  for (const variable of variables) {
    if (address >= variable.startAddress && address <= variable.endAddress) return variable;
  }
  return null;
}

function drawAllocations(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  state: MemoryDrawState,
  range: ReturnType<typeof visibleRange>,
  lod: ReturnType<typeof chooseLod>,
  hoveredByte: number | null,
): NameChip[] {
  const chips: NameChip[] = [];
  if (state.variables.length === 0) return chips;
  const gap = bitGap(layout.bitSize);
  const hoveredVariable = hoveredByte === null ? null : variableAt(state.variables, hoveredByte);

  const merge = state.mergeBytes && layout.unit === "bytes" && lod === "bytes";

  for (const variable of state.variables) {
    const selected = variable.id === state.selectedVariableId;
    const hovered = hoveredVariable?.id === variable.id;
    const firstRow = Math.floor(variable.startAddress / layout.bytesPerRow);
    const lastRow = Math.floor(variable.endAddress / layout.bytesPerRow);
    const rowStart = Math.max(firstRow, range.startRow);
    const rowEnd = Math.min(lastRow, range.endRow);

    if (merge) {
      drawMergedVariable(ctx, layout, state, range, variable, rowStart, rowEnd, selected, hovered, chips);
      continue;
    }

    for (let row = rowStart; row <= rowEnd; row += 1) {
      const rowByte = row * layout.bytesPerRow;
      const from = Math.max(variable.startAddress, rowByte + range.startCol);
      const to = Math.min(variable.endAddress, rowByte + range.endCol, rowByte + layout.bytesPerRow - 1);
      for (let address = from; address <= to; address += 1) {
        if (address >= layout.totalBytes) continue;
        const col = address - rowByte;
        const x = state.pan.x + col * layout.byteStride;
        const y = state.pan.y + row * layout.rowStride + layout.labelBlock;
        const fill = selected ? variable.selectedFill : variable.fill;
        const offset = address - variable.startAddress;
        const elementIndex = Math.floor(offset / variable.elementSize);
        const elementStart = offset % variable.elementSize === 0;
        ctx.globalAlpha = variable.arrayLength !== null && elementIndex % 2 === 1 ? 0.6 : 1;
        if (lod === "bits") {
          fillAllocatedBits(ctx, x, y, layout.bitSize, gap, fill, variable.stroke, selected || hovered);
        } else {
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, layout.byteWidth, Math.max(layout.cellHeight, 1));
          ctx.lineWidth = selected ? 1.5 : 1;
          ctx.strokeStyle = variable.stroke;
          ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, layout.byteWidth - 1), Math.max(0, layout.cellHeight - 1));
        }
        ctx.globalAlpha = 1;
        const showName = elementStart && (selected || hovered || layout.cellHeight >= 20) && layout.cellHeight >= 12;
        if (showName) {
          chips.push({ label: elementLabel(variable, elementIndex), x, y, width: layout.byteWidth, stroke: variable.stroke });
        }
      }
    }
  }
  return chips;
}

function drawMergedVariable(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  state: MemoryDrawState,
  range: ReturnType<typeof visibleRange>,
  variable: CVariable,
  rowStart: number,
  rowEnd: number,
  selected: boolean,
  hovered: boolean,
  chips: NameChip[],
): void {
  const size = variable.elementSize;
  const fontSize = Math.floor(Math.max(10, Math.min(layout.cellHeight * 0.4, 16)));

  for (let row = rowStart; row <= rowEnd; row += 1) {
    const rowByte = row * layout.bytesPerRow;
    const segmentStart = Math.max(variable.startAddress, rowByte);
    const segmentEnd = Math.min(variable.endAddress, rowByte + layout.bytesPerRow - 1, layout.totalBytes - 1);
    const firstIndex = Math.floor((segmentStart - variable.startAddress) / size);
    const lastIndex = Math.floor((segmentEnd - variable.startAddress) / size);

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const elementStart = variable.startAddress + index * size;
      const from = Math.max(segmentStart, elementStart);
      const to = Math.min(segmentEnd, elementStart + size - 1);
      const fromCol = from - rowByte;
      const toCol = to - rowByte;
      if (toCol < range.startCol || fromCol > range.endCol) continue;

      const count = toCol - fromCol + 1;
      const x = state.pan.x + fromCol * layout.byteStride;
      const y = state.pan.y + row * layout.rowStride + layout.labelBlock;
      const width = count * layout.byteWidth + (count - 1) * layout.byteGap;
      const height = Math.max(layout.cellHeight, 1);

      ctx.fillStyle = state.colors.background;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = variable.arrayLength !== null && index % 2 === 1 ? 0.6 : 1;
      ctx.fillStyle = selected ? variable.selectedFill : variable.fill;
      ctx.fillRect(x, y, width, height);
      ctx.lineWidth = selected || hovered ? 1.5 : 1;
      ctx.strokeStyle = variable.stroke;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1));
      ctx.globalAlpha = 1;

      if (layout.cellHeight >= 16) {
        ctx.font = `600 ${fontSize}px ${state.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = selected ? "#ffffff" : variable.stroke;
        const text = fitText(ctx, elementValue(variable, index) ?? "?", width - 8);
        if (text) ctx.fillText(text, x + width / 2, y + height / 2);
      }

      const showName = from === elementStart && (selected || hovered || layout.cellHeight >= 20) && layout.cellHeight >= 12;
      if (showName) {
        chips.push({ label: elementLabel(variable, index), x, y, width, stroke: variable.stroke });
      }
    }
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  for (let length = text.length - 1; length > 0; length -= 1) {
    const candidate = `${text.slice(0, length)}…`;
    if (ctx.measureText(candidate).width <= maxWidth) return candidate;
  }
  return "";
}

function drawSelectedValueBits(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  state: MemoryDrawState,
  range: ReturnType<typeof visibleRange>,
): void {
  if (layout.bitSize < 14 || !state.selectedVariableId) return;
  const variable = state.variables.find((item) => item.id === state.selectedVariableId);
  if (!variable) return;
  const elementBits = new Map<number, string | null>();
  const bitsOf = (index: number) => {
    if (!elementBits.has(index)) elementBits.set(index, elementBitString(variable, index));
    return elementBits.get(index) ?? null;
  };

  const gap = bitGap(layout.bitSize);
  const cell = Math.max(0.5, layout.bitSize - gap);
  ctx.font = `600 ${Math.max(9, Math.floor(cell * 0.62))}px ${state.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";

  const firstRow = Math.floor(variable.startAddress / layout.bytesPerRow);
  const lastRow = Math.floor(variable.endAddress / layout.bytesPerRow);
  const rowStart = Math.max(firstRow, range.startRow);
  const rowEnd = Math.min(lastRow, range.endRow);

  for (let row = rowStart; row <= rowEnd; row += 1) {
    const rowByte = row * layout.bytesPerRow;
    const from = Math.max(variable.startAddress, rowByte + range.startCol);
    const to = Math.min(variable.endAddress, rowByte + range.endCol, rowByte + layout.bytesPerRow - 1);
    for (let address = from; address <= to; address += 1) {
      const offset = address - variable.startAddress;
      const bits = bitsOf(Math.floor(offset / variable.elementSize));
      if (!bits) continue;
      const byteInElement = offset % variable.elementSize;
      const col = address - rowByte;
      const x = state.pan.x + col * layout.byteStride;
      const y = state.pan.y + row * layout.rowStride + layout.labelBlock + cell / 2;
      for (let slot = 0; slot < BITS_PER_BYTE; slot += 1) {
        const bit = bits[byteInElement * BITS_PER_BYTE + slot];
        if (bit !== "0" && bit !== "1") continue;
        ctx.fillText(bit, x + slot * layout.bitSize + cell / 2, y);
      }
    }
  }
}

function fillAllocatedBits(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bitSize: number,
  gap: number,
  fill: string,
  stroke: string,
  emphasize: boolean,
): void {
  const size = Math.max(0.5, bitSize - gap);
  ctx.fillStyle = fill;
  for (let slot = 0; slot < BITS_PER_BYTE; slot += 1) {
    ctx.fillRect(x + slot * bitSize, y, size, size);
  }
  ctx.lineWidth = emphasize ? 1.5 : 1;
  ctx.strokeStyle = stroke;
  ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, bitSize * BITS_PER_BYTE - gap - 1), Math.max(0, size - 1));
}

function drawVariableName(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  width: number,
  stroke: string,
  background: string,
  fontFamily: string,
): void {
  ctx.font = `600 11px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const boxWidth = Math.min(width, Math.max(ctx.measureText(name).width + 10, 52));
  const boxHeight = 15;
  const left = x + width / 2 - boxWidth / 2;
  const top = y - boxHeight - 1;
  ctx.fillStyle = background;
  ctx.fillRect(left, top, boxWidth, boxHeight);
  ctx.fillStyle = stroke;
  ctx.fillText(name, x + width / 2, y - 2);
}

function drawBitGrid(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  pan: PanPosition,
  range: ReturnType<typeof visibleRange>,
  hoveredByte: number | null,
  selectedByte: number | null,
  colors: MemoryPalette,
): void {
  const gap = bitGap(layout.bitSize);
  ctx.beginPath();
  for (let row = range.startRow; row <= range.endRow; row += 1) {
    for (let col = range.startCol; col <= range.endCol; col += 1) {
      const byteIndex = row * layout.bytesPerRow + col;
      if (byteIndex >= layout.totalBytes) continue;
      if (byteIndex === hoveredByte || byteIndex === selectedByte) continue;
      addBitCells(
        ctx,
        pan.x + col * layout.byteStride,
        pan.y + row * layout.rowStride + layout.labelBlock,
        layout.bitSize,
        gap,
      );
    }
  }
  ctx.fillStyle = colors.cell;
  ctx.fill();

  if (range.visibleBytes > 2000) return;

  ctx.beginPath();
  for (let row = range.startRow; row <= range.endRow; row += 1) {
    for (let col = range.startCol; col <= range.endCol; col += 1) {
      const byteIndex = row * layout.bytesPerRow + col;
      if (byteIndex >= layout.totalBytes) continue;
      if (byteIndex === hoveredByte || byteIndex === selectedByte) continue;
      const x = pan.x + col * layout.byteStride;
      const y = pan.y + row * layout.rowStride + layout.labelBlock;
      ctx.rect(
        x + 0.5,
        y + 0.5,
        Math.max(0, layout.byteWidth - gap - 1),
        Math.max(0, layout.bitSize - gap - 1),
      );
    }
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.border;
  ctx.stroke();
}

function drawByteBlocks(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  pan: PanPosition,
  range: ReturnType<typeof visibleRange>,
  hoveredByte: number | null,
  selectedByte: number | null,
  colors: MemoryPalette,
): void {
  ctx.beginPath();
  for (let row = range.startRow; row <= range.endRow; row += 1) {
    for (let col = range.startCol; col <= range.endCol; col += 1) {
      const byteIndex = row * layout.bytesPerRow + col;
      if (byteIndex >= layout.totalBytes) continue;
      if (byteIndex === hoveredByte || byteIndex === selectedByte) continue;
      const x = pan.x + col * layout.byteStride;
      const y = pan.y + row * layout.rowStride + layout.labelBlock;
      ctx.rect(x + 0.5, y + 0.5, Math.max(0, layout.byteWidth - 1), Math.max(0, layout.cellHeight - 1));
    }
  }
  ctx.fillStyle = colors.cell;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.border;
  ctx.stroke();
}

function drawRowBands(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  pan: PanPosition,
  range: ReturnType<typeof visibleRange>,
  colors: MemoryPalette,
): void {
  ctx.fillStyle = colors.cell;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;

  for (let row = range.startRow; row <= range.endRow; row += 1) {
    const rowStart = row * layout.bytesPerRow;
    if (rowStart >= layout.totalBytes) break;
    const firstCol = range.startCol;
    const lastCol = Math.min(range.endCol, layout.bytesPerRow - 1, layout.totalBytes - rowStart - 1);
    if (lastCol < firstCol) continue;
    const count = lastCol - firstCol + 1;
    const x = pan.x + firstCol * layout.byteStride;
    const y = pan.y + row * layout.rowStride + layout.labelBlock;
    const width = count * layout.byteWidth + Math.max(0, count - 1) * layout.byteGap;
    const bandHeight = Math.max(layout.cellHeight, 1);
    ctx.fillRect(x, y, width, bandHeight);
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, bandHeight - 1));
  }
}

function bitGap(bitSize: number): number {
  if (bitSize >= 16) return 3;
  if (bitSize >= 8) return 1.5;
  if (bitSize >= 4) return 1;
  return 0;
}

function addBitCells(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bitSize: number,
  gap: number,
): void {
  const size = Math.max(0.5, bitSize - gap);
  for (let slot = 0; slot < BITS_PER_BYTE; slot += 1) {
    ctx.rect(x + slot * bitSize, y, size, size);
  }
}

function drawByteHighlight(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  pan: PanPosition,
  byteIndex: number,
  kind: "hover" | "selected",
  colors: MemoryPalette,
): void {
  if (byteIndex < 0 || byteIndex >= layout.totalBytes) return;
  const origin = byteOrigin(layout, byteIndex);
  const x = pan.x + origin.x;
  const y = pan.y + origin.y;
  const bit = layout.bitSize;
  const inset = Math.min(1.5, Math.max(0.4, bit * 0.07));

  ctx.fillStyle = kind === "selected" ? colors.selected : colors.hoverByte;
  if (layout.unit === "bytes") {
    ctx.fillRect(x, y, layout.byteWidth, layout.cellHeight);
    ctx.lineWidth = kind === "selected" ? 1.5 : 1;
    ctx.strokeStyle = colors.hover;
    ctx.strokeRect(x + 0.5, y + 0.5, layout.byteWidth - 1, layout.cellHeight - 1);
    return;
  }
  for (let slot = 0; slot < BITS_PER_BYTE; slot += 1) {
    ctx.fillRect(x + slot * bit + inset, y + inset, Math.max(0.5, bit - inset * 2), Math.max(0.5, bit - inset * 2));
  }

  ctx.lineWidth = kind === "selected" ? 1.5 : 1;
  ctx.strokeStyle = colors.hover;
  ctx.strokeRect(x + 0.5, y + 0.5, layout.byteWidth - 1, bit - 1);
}

function drawBitMarker(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  pan: PanPosition,
  byteIndex: number,
  slot: number,
  colors: MemoryPalette,
): void {
  if (byteIndex < 0 || byteIndex >= layout.totalBytes) return;
  const origin = byteOrigin(layout, byteIndex);
  const bit = layout.bitSize;
  const inset = Math.min(1.5, Math.max(0.4, bit * 0.07));
  const x = pan.x + origin.x + slot * bit + inset;
  const y = pan.y + origin.y + inset;
  const size = Math.max(0.5, bit - inset * 2);

  ctx.fillStyle = colors.hover;
  ctx.fillRect(x, y, size, size);
  if (bit >= 8) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.bitMarker;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  layout: MemoryLayout,
  state: MemoryDrawState,
  range: ReturnType<typeof visibleRange>,
  hoveredByte: number | null,
): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const addressOffset =
    layout.footerHeight > 0
      ? layout.labelBlock + layout.cellHeight + layout.footerHeight / 2
      : layout.addressHeight / 2;

  for (let row = range.startRow; row <= range.endRow; row += 1) {
    const rowTop = state.pan.y + row * layout.rowStride;
    for (let col = range.startCol; col <= range.endCol; col += 1) {
      const byteIndex = row * layout.bytesPerRow + col;
      if (byteIndex >= layout.totalBytes) continue;
      const x = state.pan.x + col * layout.byteStride;
      const emphasized = byteIndex === state.selectedByte || byteIndex === hoveredByte;

      if (layout.showAddress) {
        ctx.font = `500 11px ${state.fontFamily}`;
        ctx.fillStyle = emphasized ? state.colors.text : state.colors.muted;
        ctx.fillText(
          formatAddress(byteIndex, state.addressFormat),
          x + layout.byteWidth / 2,
          rowTop + addressOffset,
        );
      }

      if (layout.showBitPositions) {
        ctx.font = `500 10px ${state.fontFamily}`;
        ctx.fillStyle = state.colors.muted;
        const labelY = rowTop + layout.addressHeight + layout.bitLabelHeight / 2;
        for (let slot = 0; slot < BITS_PER_BYTE; slot += 1) {
          ctx.fillText(
            String(BITS_PER_BYTE - 1 - slot),
            x + slot * layout.bitSize + layout.bitSize / 2,
            labelY,
          );
        }
      }
    }
  }
}
