export function formatHexAddress(address: number, digits = 4): string {
  const safe = Math.max(0, Math.floor(address));
  return `0x${safe.toString(16).toUpperCase().padStart(Math.max(1, digits), "0")}`;
}

export function hexDigitsForByteCount(sizeInBytes: number): number {
  const last = Math.max(0, Math.floor(sizeInBytes) - 1);
  return Math.max(4, last.toString(16).length);
}

export function getAddressRange(sizeInBytes: number): {
  start: number;
  end: number;
  digits: number;
  startLabel: string;
  endLabel: string;
  label: string;
} {
  const bytes = Math.max(0, Math.floor(sizeInBytes));
  const start = 0;
  const end = Math.max(0, bytes - 1);
  const digits = hexDigitsForByteCount(bytes);
  const startLabel = formatHexAddress(start, digits);
  const endLabel = formatHexAddress(end, digits);

  return {
    start,
    end,
    digits,
    startLabel,
    endLabel,
    label: `${startLabel} — ${endLabel}`,
  };
}
