import type { CDataType } from "@/lib/c-parser/c-types";

const ESCAPES: Record<string, number> = {
  n: 10,
  t: 9,
  r: 13,
  "0": 0,
  "\\": 92,
  "'": 39,
  '"': 34,
  a: 7,
  b: 8,
  f: 12,
  v: 11,
};

/** Bits of a declared value, most significant bit first, with no separators. */
export function variableBitString(type: CDataType, value: string | null, sizeInBytes: number): string | null {
  if (value === null) return null;
  const bits = sizeInBytes * 8;
  if (bits <= 0) return null;

  if (type === "float" || type === "double") {
    const numeric = Number(value.trim().replace(/[fFlL]$/, ""));
    if (!Number.isFinite(numeric)) return null;
    return floatBits(numeric, type === "float" ? 4 : 8).replaceAll(" ", "");
  }

  const character = charLiteralValue(value.trim());
  if (type === "char" && character !== null) return integerBits(BigInt(character), 8);

  const integer = integerLiteralValue(value.trim());
  if (integer === null) return null;
  return integerBits(integer, bits);
}

/** Bits of a declared value, most significant bit first, grouped by byte. */
export function formatVariableBinary(type: CDataType, value: string | null, sizeInBytes: number): string | null {
  const bits = variableBitString(type, value, sizeInBytes);
  if (!bits) return null;
  return groupBits(bits);
}

type ElementSource = {
  type: CDataType;
  value: string | null;
  elementSize: number;
  arrayLength: number | null;
  elements: readonly string[] | null;
};

/** Value of one array element. A scalar has a single element at index 0. */
export function elementValue(variable: ElementSource, index: number): string | null {
  if (variable.arrayLength === null) return variable.value;
  if (!variable.elements) return null;
  return variable.elements[index] ?? (variable.type === "char" ? "'\\0'" : "0");
}

/** Bits of one array element, most significant bit first, with no separators. */
export function elementBitString(variable: ElementSource, index: number): string | null {
  return variableBitString(variable.type, elementValue(variable, index), variable.elementSize);
}

/** Bits of one array element grouped by byte. */
export function formatElementBinary(variable: ElementSource, index: number): string | null {
  const bits = elementBitString(variable, index);
  return bits ? groupBits(bits) : null;
}

function groupBits(bits: string): string {
  return bits.match(/.{8}/g)?.join(" ") ?? bits;
}

function integerBits(value: bigint, width: number): string {
  const one = BigInt(1);
  const mask = (one << BigInt(width)) - one;
  const wrapped = value < BigInt(0) ? (one << BigInt(width)) + value : value;
  return (wrapped & mask).toString(2).padStart(width, "0");
}

function integerLiteralValue(raw: string): bigint | null {
  const match = /^([+-]?)(0x[0-9a-fA-F]+|0[0-7]+|\d+)(?:ull|llu|ul|lu|ll|l|u)?$/i.exec(raw.replace(/\s+/g, ""));
  if (!match) return null;
  const magnitude = BigInt(match[2]);
  return match[1] === "-" ? -magnitude : magnitude;
}

function charLiteralValue(raw: string): number | null {
  const match = /^'(?:\\x([0-9a-fA-F]{1,2})|\\([0-7]{1,3})|\\(.)|(.)|)'$/.exec(raw);
  if (!match) return null;
  if (match[1] !== undefined) return Number.parseInt(match[1], 16);
  if (match[2] !== undefined) return Number.parseInt(match[2], 8) & 0xff;
  if (match[3] !== undefined) return ESCAPES[match[3]] ?? match[3].charCodeAt(0);
  if (match[4] !== undefined) return match[4].charCodeAt(0);
  return null;
}

function floatBits(value: number, bytes: 4 | 8): string {
  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);
  if (bytes === 4) view.setFloat32(0, value, false);
  else view.setFloat64(0, value, false);
  const parts: string[] = [];
  for (let index = 0; index < bytes; index += 1) {
    parts.push(view.getUint8(index).toString(2).padStart(8, "0"));
  }
  return parts.join(" ");
}
