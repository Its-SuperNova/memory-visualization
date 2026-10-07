import { BITS_PER_BYTE } from "@/lib/memory/memory-constants";
import {
  MEMORY_SIZE_OPTIONS,
  type MemoryAllocation,
  type MemoryModel,
  type MemorySize,
} from "@/lib/memory/memory-types";

const MEMORY_SIZES = new Set<string>(MEMORY_SIZE_OPTIONS.map((option) => option.id));

export function isMemorySize(value: string): value is MemorySize {
  return MEMORY_SIZES.has(value);
}

export function memorySizeOption(size: MemorySize) {
  const option = MEMORY_SIZE_OPTIONS.find((entry) => entry.id === size);
  if (!option) {
    throw new Error(`Unknown memory size: ${size}`);
  }
  return option;
}

export function memorySizeToBytes(size: MemorySize): number {
  return memorySizeOption(size).bytes;
}

export function bytesToBits(bytes: number): number {
  return bytes * BITS_PER_BYTE;
}

/**
 * Bit boxes are stored left to right as bit 7 … bit 0 inside each byte.
 * bitIndex 0 is byte 0, bit position 7 (the most significant bit).
 */
export function bitIndexToByteAddress(bitIndex: number): number {
  return Math.floor(bitIndex / BITS_PER_BYTE);
}

export function bitIndexToPosition(bitIndex: number): number {
  return BITS_PER_BYTE - 1 - (bitIndex % BITS_PER_BYTE);
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatMemorySize(bytes: number): string {
  if (bytes > 0 && bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MB`;
  }
  if (bytes > 0 && bytes % 1024 === 0) {
    return `${bytes / 1024} KB`;
  }
  return `${formatInteger(bytes)} Bytes`;
}

export function createMemoryModel(
  size: MemorySize,
  allocations: MemoryAllocation[] = [],
): MemoryModel {
  const sizeInBytes = memorySizeToBytes(size);
  return {
    size,
    sizeInBytes,
    totalBits: bytesToBits(sizeInBytes),
    allocations,
  };
}

export function variableAtAddress<T extends { startAddress: number; endAddress: number }>(
  variables: readonly T[],
  byteAddress: number,
): T | null {
  for (const variable of variables) {
    if (byteAddress >= variable.startAddress && byteAddress <= variable.endAddress) return variable;
  }
  return null;
}

export function variableToAllocation(variable: {
  id: string;
  name: string;
  type: string;
  startAddress: number;
  sizeInBytes: number;
}): MemoryAllocation {
  return {
    id: variable.id,
    name: variable.name,
    cType: variable.type,
    address: variable.startAddress,
    sizeInBytes: variable.sizeInBytes,
  };
}

export function findAllocation(
  allocations: readonly MemoryAllocation[],
  byteAddress: number,
): MemoryAllocation | undefined {
  return allocations.find(
    (allocation) =>
      byteAddress >= allocation.address &&
      byteAddress < allocation.address + allocation.sizeInBytes,
  );
}
