import {
  BASE_BIT_SIZE,
  BITS_PER_BYTE,
  BYTES_PER_ROW,
  MAX_ZOOM,
  MIN_ZOOM,
  WORKSPACE_PADDING,
  ZOOM_STEP,
} from "@/lib/memory/memory-constants";
import { bitIndexToByteAddress, bitIndexToPosition } from "@/lib/memory/memory-utils";
import type { HoveredBit, PanPosition, ViewportSize } from "@/lib/memory/memory-types";

export type MemoryLayout = {
  bitSize: number;
  byteWidth: number;
  byteGap: number;
  rowGap: number;
  byteStride: number;
  rowStride: number;
  addressHeight: number;
  bitLabelHeight: number;
  labelBlock: number;
  bytesPerRow: number;
  rows: number;
  contentWidth: number;
  contentHeight: number;
  totalBytes: number;
  showAddress: boolean;
  showBitPositions: boolean;
};

export type VisibleRange = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  visibleBytes: number;
};

export type FocusPoint =
  | { kind: "byte"; byteIndex: number; fracX: number; fracY: number }
  | { kind: "content"; fracX: number; fracY: number };

export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  const percent = Math.round(clampZoom(zoom) * 100);
  return clampZoom((percent + direction * ZOOM_STEP * 100) / 100);
}

export function wheelZoom(zoom: number, deltaY: number): number {
  return clampZoom(clampZoom(zoom) * Math.exp(-deltaY * 0.0015));
}

export function computeLayout(
  _viewportWidth: number,
  zoom: number,
  totalBytes: number,
): MemoryLayout {
  const safeBytes = Math.max(0, Math.floor(totalBytes));
  const bitSize = BASE_BIT_SIZE * clampZoom(zoom);
  const byteWidth = bitSize * BITS_PER_BYTE;
  const byteGap = Math.max(4, bitSize * 0.42);
  const rowGap = Math.max(4, bitSize * 0.36);
  const showBitPositions = bitSize >= 32;
  const showAddress = bitSize >= 24;
  const addressHeight = showAddress ? 16 : 0;
  const bitLabelHeight = showBitPositions ? 14 : 0;
  const labelBlock = addressHeight + bitLabelHeight;
  const byteStride = byteWidth + byteGap;
  const rowStride = labelBlock + bitSize + rowGap;
  const bytesPerRow = safeBytes === 0 ? 1 : Math.min(BYTES_PER_ROW, safeBytes);
  const rows = safeBytes === 0 ? 0 : Math.ceil(safeBytes / bytesPerRow);
  const contentWidth =
    rows === 0 ? 0 : bytesPerRow * byteWidth + Math.max(0, bytesPerRow - 1) * byteGap;
  const contentHeight = rows === 0 ? 0 : rows * rowStride - rowGap;

  return {
    bitSize,
    byteWidth,
    byteGap,
    rowGap,
    byteStride,
    rowStride,
    addressHeight,
    bitLabelHeight,
    labelBlock,
    bytesPerRow,
    rows,
    contentWidth,
    contentHeight,
    totalBytes: safeBytes,
    showAddress,
    showBitPositions,
  };
}

export function panToAddressRange(
  startAddress: number,
  endAddress: number,
  layout: MemoryLayout,
  viewport: ViewportSize,
): PanPosition {
  if (layout.totalBytes <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0 };
  }
  const start = Math.max(0, Math.min(startAddress, layout.totalBytes - 1));
  const end = Math.max(start, Math.min(endAddress, layout.totalBytes - 1));
  const origin = byteOrigin(layout, start);
  const finish = byteOrigin(layout, end);
  const minX = Math.min(origin.x, finish.x);
  const maxX = Math.max(origin.x, finish.x) + layout.byteWidth;
  const minY = Math.min(origin.y, finish.y);
  const maxY = Math.max(origin.y, finish.y) + layout.bitSize;
  return clampPan(
    {
      x: viewport.width / 2 - (minX + maxX) / 2,
      y: viewport.height / 2 - (minY + maxY) / 2,
    },
    layout,
    viewport,
  );
}

export function byteOrigin(layout: MemoryLayout, byteIndex: number): { x: number; y: number } {
  const row = Math.floor(byteIndex / layout.bytesPerRow);
  const col = byteIndex % layout.bytesPerRow;
  return {
    x: col * layout.byteStride,
    y: row * layout.rowStride + layout.labelBlock,
  };
}

export function clampPan(
  pan: PanPosition,
  layout: MemoryLayout,
  viewport: ViewportSize,
): PanPosition {
  const margin = 64;
  let x = pan.x;
  let y = pan.y;

  const minX = margin - layout.contentWidth;
  const maxX = viewport.width - margin;
  if (minX <= maxX) {
    x = Math.min(maxX, Math.max(minX, x));
  }

  const minY = margin - layout.contentHeight;
  const maxY = viewport.height - margin;
  if (minY <= maxY) {
    y = Math.min(maxY, Math.max(minY, y));
  }

  return { x, y };
}

export function initialPan(layout: MemoryLayout, viewport: ViewportSize): PanPosition {
  const fitsHorizontally = layout.contentWidth + WORKSPACE_PADDING * 2 <= viewport.width;
  const x = fitsHorizontally ? (viewport.width - layout.contentWidth) / 2 : WORKSPACE_PADDING;
  const fitsVertically = layout.contentHeight + WORKSPACE_PADDING * 2 <= viewport.height;
  const y = fitsVertically ? (viewport.height - layout.contentHeight) / 2 : WORKSPACE_PADDING;
  return clampPan({ x, y }, layout, viewport);
}

export function layoutFits(
  viewport: ViewportSize,
  zoom: number,
  totalBytes: number,
): boolean {
  const layout = computeLayout(viewport.width, zoom, totalBytes);
  return (
    layout.contentWidth <= viewport.width - WORKSPACE_PADDING * 2 + 1 &&
    layout.contentHeight <= viewport.height - WORKSPACE_PADDING * 2 + 1
  );
}

export function computeFitZoom(viewport: ViewportSize, totalBytes: number): number {
  let low = MIN_ZOOM;
  let high = MAX_ZOOM;
  let best = MIN_ZOOM;

  for (let attempt = 0; attempt < 22; attempt += 1) {
    const mid = (low + high) / 2;
    if (layoutFits(viewport, mid, totalBytes)) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return best;
}

export function hitTest(
  screenX: number,
  screenY: number,
  pan: PanPosition,
  layout: MemoryLayout,
): HoveredBit | null {
  if (layout.totalBytes === 0 || layout.bitSize <= 0) return null;

  const worldX = screenX - pan.x;
  const worldY = screenY - pan.y;
  if (worldX < 0 || worldY < 0 || worldX >= layout.contentWidth || worldY >= layout.contentHeight) {
    return null;
  }

  const row = Math.floor(worldY / layout.rowStride);
  const col = Math.floor(worldX / layout.byteStride);
  if (row < 0 || col < 0 || row >= layout.rows || col >= layout.bytesPerRow) return null;

  const localX = worldX - col * layout.byteStride;
  const localY = worldY - row * layout.rowStride;
  if (localX < 0 || localX >= layout.byteWidth) return null;
  if (localY < layout.labelBlock || localY >= layout.labelBlock + layout.bitSize) return null;

  const byteAddress = row * layout.bytesPerRow + col;
  if (byteAddress < 0 || byteAddress >= layout.totalBytes) return null;

  const slot = Math.min(BITS_PER_BYTE - 1, Math.max(0, Math.floor(localX / layout.bitSize)));
  const bitIndex = byteAddress * BITS_PER_BYTE + slot;
  return {
    bitIndex,
    byteAddress: bitIndexToByteAddress(bitIndex),
    bitPosition: bitIndexToPosition(bitIndex),
  };
}

export function describeFocus(
  screenX: number,
  screenY: number,
  pan: PanPosition,
  layout: MemoryLayout,
): FocusPoint {
  if (layout.contentWidth <= 0 || layout.contentHeight <= 0 || layout.totalBytes === 0) {
    return { kind: "content", fracX: 0.5, fracY: 0.5 };
  }

  const worldX = screenX - pan.x;
  const worldY = screenY - pan.y;
  const row = Math.floor(worldY / layout.rowStride);
  const col = Math.floor(worldX / layout.byteStride);

  if (row >= 0 && col >= 0 && row < layout.rows && col < layout.bytesPerRow) {
    const byteIndex = row * layout.bytesPerRow + col;
    if (byteIndex >= 0 && byteIndex < layout.totalBytes) {
      const origin = byteOrigin(layout, byteIndex);
      return {
        kind: "byte",
        byteIndex,
        fracX: (worldX - origin.x) / layout.byteWidth,
        fracY: (worldY - origin.y) / layout.bitSize,
      };
    }
  }

  return {
    kind: "content",
    fracX: worldX / layout.contentWidth,
    fracY: worldY / layout.contentHeight,
  };
}

export function panForFocus(
  focus: FocusPoint,
  screenX: number,
  screenY: number,
  layout: MemoryLayout,
): PanPosition {
  if (focus.kind === "byte" && layout.totalBytes > 0) {
    const byteIndex = Math.min(focus.byteIndex, layout.totalBytes - 1);
    const origin = byteOrigin(layout, byteIndex);
    return {
      x: screenX - (origin.x + focus.fracX * layout.byteWidth),
      y: screenY - (origin.y + focus.fracY * layout.bitSize),
    };
  }

  return {
    x: screenX - focus.fracX * layout.contentWidth,
    y: screenY - focus.fracY * layout.contentHeight,
  };
}

export function visibleRange(
  layout: MemoryLayout,
  pan: PanPosition,
  width: number,
  height: number,
): VisibleRange {
  if (layout.rows === 0 || layout.bytesPerRow === 0) {
    return { startRow: 0, endRow: -1, startCol: 0, endCol: -1, visibleBytes: 0 };
  }

  const startRow = clampIndex(Math.floor(-pan.y / layout.rowStride) - 1, layout.rows);
  const endRow = clampIndex(Math.ceil((-pan.y + height) / layout.rowStride) + 1, layout.rows);
  const startCol = clampIndex(Math.floor(-pan.x / layout.byteStride) - 1, layout.bytesPerRow);
  const endCol = clampIndex(Math.ceil((-pan.x + width) / layout.byteStride) + 1, layout.bytesPerRow);
  const rows = Math.max(0, endRow - startRow + 1);
  const cols = Math.max(0, endCol - startCol + 1);

  return { startRow, endRow, startCol, endCol, visibleBytes: rows * cols };
}

function clampIndex(value: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, value));
}

export type DrawLod = "bits" | "bytes" | "rows";

const MAX_BIT_CELLS = 12000;
const MAX_BYTE_CELLS = 8000;

export function chooseLod(bitSize: number, visibleBytes: number): DrawLod {
  if (bitSize >= 8 && visibleBytes * BITS_PER_BYTE <= MAX_BIT_CELLS) return "bits";
  if (visibleBytes <= MAX_BYTE_CELLS) return "bytes";
  return "rows";
}

export function estimateLod(layout: MemoryLayout, viewport: ViewportSize): DrawLod {
  if (viewport.width <= 0 || viewport.height <= 0) return "bits";
  const cols = Math.min(
    layout.bytesPerRow,
    Math.ceil(viewport.width / Math.max(layout.byteStride, 1)) + 2,
  );
  const rows = Math.min(
    layout.rows,
    Math.ceil(viewport.height / Math.max(layout.rowStride, 1)) + 2,
  );
  return chooseLod(layout.bitSize, Math.max(0, cols) * Math.max(0, rows));
}
