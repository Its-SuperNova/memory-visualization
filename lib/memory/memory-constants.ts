export const BITS_PER_BYTE = 8;

/** Bit cell edge length at 100% zoom, in CSS pixels. */
export const BASE_BIT_SIZE = 22;

/** Byte cell size at 100% zoom in the bytes view, in CSS pixels. */
export const BASE_BYTE_WIDTH = 64;
export const BASE_BYTE_HEIGHT = 40;

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;
export const ZOOM_STEP = 0.25;

export const WORKSPACE_PADDING = 40;

/** Bytes across each row. Zoom scales the cells; it does not change this count. */
export const BYTES_PER_ROW = 16;

export type MemoryPalette = {
  background: string;
  border: string;
  cell: string;
  hover: string;
  hoverByte: string;
  selected: string;
  text: string;
  muted: string;
  bitMarker: string;
};

export const DARK_PALETTE: MemoryPalette = {
  background: "#0A0A0A",
  border: "#262626",
  cell: "#111111",
  hover: "#2D37FF",
  hoverByte: "rgba(45, 55, 255, 0.22)",
  selected: "#2D37FF",
  text: "#FFFFFF",
  muted: "#8A8A8A",
  bitMarker: "rgba(255, 255, 255, 0.92)",
};

export const LIGHT_PALETTE: MemoryPalette = {
  background: "#F4F4F5",
  border: "#D4D4D8",
  cell: "#FFFFFF",
  hover: "#2D37FF",
  hoverByte: "rgba(45, 55, 255, 0.14)",
  selected: "#2D37FF",
  text: "#111111",
  muted: "#6B6B6B",
  bitMarker: "rgba(255, 255, 255, 0.95)",
};

export const COLORS = DARK_PALETTE;
