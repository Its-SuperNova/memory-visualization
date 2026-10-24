import type { AddressBase } from "@/lib/memory/memory-types";

export type AddressFormat = {
  base: AddressBase;
  /** Minimum hexadecimal digits. */
  digits: number;
  /** Decimal digits of the last address, for example 4 for 1023. */
  decimalDigits: number;
};

export function formatHexAddress(address: number, digits = 4): string {
  const safe = Math.max(0, Math.floor(address));
  return `0x${safe.toString(16).toUpperCase().padStart(Math.max(1, digits), "0")}`;
}

export function formatAddress(address: number, format: AddressFormat): string {
  if (format.base === "hex") return formatHexAddress(address, format.digits);
  return String(Math.max(0, Math.floor(address))).padStart(Math.max(1, format.decimalDigits), "0");
}

export function formatAddressRange(start: number, end: number, format: AddressFormat): string {
  return start === end
    ? formatAddress(start, format)
    : `${formatAddress(start, format)} – ${formatAddress(end, format)}`;
}

export function hexDigitsForByteCount(sizeInBytes: number): number {
  const last = Math.max(0, Math.floor(sizeInBytes) - 1);
  return Math.max(4, last.toString(16).length);
}

export function decimalDigitsForByteCount(sizeInBytes: number): number {
  const last = Math.max(0, Math.floor(sizeInBytes) - 1);
  return String(last).length;
}

export function getAddressRange(
  sizeInBytes: number,
  base: AddressBase = "hex",
): {
  start: number;
  end: number;
  format: AddressFormat;
  startLabel: string;
  endLabel: string;
  label: string;
} {
  const bytes = Math.max(0, Math.floor(sizeInBytes));
  const start = 0;
  const end = Math.max(0, bytes - 1);
  const format: AddressFormat = {
    base,
    digits: hexDigitsForByteCount(bytes),
    decimalDigits: decimalDigitsForByteCount(bytes),
  };
  const startLabel = formatAddress(start, format);
  const endLabel = formatAddress(end, format);

  return {
    start,
    end,
    format,
    startLabel,
    endLabel,
    label: `${startLabel} — ${endLabel}`,
  };
}
