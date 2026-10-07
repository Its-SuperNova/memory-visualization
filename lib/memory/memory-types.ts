export const MEMORY_SIZE_OPTIONS = [
  { id: "1KB", label: "1 KB", bytes: 1024 },
  { id: "2KB", label: "2 KB", bytes: 2 * 1024 },
  { id: "4KB", label: "4 KB", bytes: 4 * 1024 },
  { id: "8KB", label: "8 KB", bytes: 8 * 1024 },
  { id: "16KB", label: "16 KB", bytes: 16 * 1024 },
  { id: "32KB", label: "32 KB", bytes: 32 * 1024 },
  { id: "64KB", label: "64 KB", bytes: 64 * 1024 },
  { id: "128KB", label: "128 KB", bytes: 128 * 1024 },
  { id: "256KB", label: "256 KB", bytes: 256 * 1024 },
  { id: "512KB", label: "512 KB", bytes: 512 * 1024 },
  { id: "1MB", label: "1 MB", bytes: 1024 * 1024 },
  { id: "2MB", label: "2 MB", bytes: 2 * 1024 * 1024 },
  { id: "4MB", label: "4 MB", bytes: 4 * 1024 * 1024 },
  { id: "8MB", label: "8 MB", bytes: 8 * 1024 * 1024 },
] as const;

export type MemorySize = (typeof MEMORY_SIZE_OPTIONS)[number]["id"];

import type { CDataType } from "@/lib/c-parser/c-types";

/**
 * A variable or object placed in memory.
 * One address is one byte. An int of 4 bytes occupies four addresses.
 */
export type MemoryAllocation = {
  id: string;
  /** C identifier, for example "age". */
  name: string;
  /** C type name, for example "int" or "char". */
  cType: string;
  /** First byte address occupied by the value. */
  address: number;
  sizeInBytes: number;
};

/** A detected local variable and the bytes reserved for it. */
export type CVariable = {
  id: string;
  name: string;
  type: CDataType;
  value: string | null;
  sizeInBytes: number;
  startAddress: number;
  endAddress: number;
  lineNumber: number;
  column: number;
  endColumn: number;
  colorId: string;
  fill: string;
  selectedFill: string;
  stroke: string;
};

export type MemoryModel = {
  size: MemorySize;
  sizeInBytes: number;
  totalBits: number;
  allocations: MemoryAllocation[];
};

export type PanPosition = {
  x: number;
  y: number;
};

/** Pointer selects bits. Hand drags the memory view. */
export type WorkspaceTool = "pointer" | "hand";

export type ViewportSize = {
  width: number;
  height: number;
};

/** A single bit inside a byte. Addresses belong to the byte, not the bit. */
export type HoveredBit = {
  bitIndex: number;
  byteAddress: number;
  bitPosition: number;
};
