import { C_TYPE_SIZES, type CDataType, type ParseIssue, type ParseResult, type ParsedVariable } from "@/lib/c-parser/c-types";
import { isIdentifierPart, isIdentifierStart, skipSpaces, stripComments } from "@/lib/c-parser/parser-utils";

const SIMPLE_TYPES = ["char", "short", "int", "long", "float", "double"] as const;

const MAX_ARRAY_LENGTH = 0x7fffffff;

type LineContext = {
  /** Comments and string contents blanked; used to find tokens. */
  scan: string;
  /** Comments blanked, strings kept; used to read initializer text. */
  text: string;
  lineNumber: number;
  seen: Set<string>;
  variables: ParsedVariable[];
  issues: ParseIssue[];
};

type ArraySize =
  | { ok: true; length: number | null; end: number }
  | { ok: false; message: string; severity: ParseIssue["severity"]; column: number; endColumn: number };

type ArrayInitializer = { ok: true; elements: string[]; fromString: boolean } | { ok: false; message: string; severity: ParseIssue["severity"] };

export function parseCVariables(source: string): ParseResult {
  const scanLines = stripComments(source).split("\n");
  const textLines = stripComments(source, true).split("\n");
  const seen = new Set<string>();
  const variables: ParsedVariable[] = [];
  const issues: ParseIssue[] = [];

  for (let lineIndex = 0; lineIndex < scanLines.length; lineIndex += 1) {
    parseLine({
      scan: scanLines[lineIndex],
      text: textLines[lineIndex] ?? scanLines[lineIndex],
      lineNumber: lineIndex + 1,
      seen,
      variables,
      issues,
    });
  }

  return { variables, issues };
}

function parseLine(context: LineContext): void {
  const { scan: line, text, lineNumber, seen, variables, issues } = context;
  const report = (column: number, endColumn: number, message: string, severity: ParseIssue["severity"]) => {
    issues.push({ lineNumber, column, endColumn, message, severity });
  };
  let index = 0;

  while (index < line.length) {
    index = skipSpaces(line, index);
    if (index >= line.length) return;

    const typeMatch = matchType(line, index);
    if (!typeMatch || (index > 0 && isIdentifierPart(line[index - 1]))) {
      index = skipPlainToken(line, index);
      continue;
    }

    const typeStart = index;
    index += typeMatch.raw.length;
    index = skipSpaces(line, index);

    if (line[index] === "*") {
      report(index + 1, index + 2, "Pointers are not allocated in this lesson.", "warning");
      index = skipStatement(line, index);
      continue;
    }

    if (!isIdentifierStart(line[index])) {
      report(typeStart + 1, typeStart + typeMatch.raw.length + 1, "Expected variable name", "error");
      index = skipStatement(line, index);
      continue;
    }

    while (index < line.length) {
      index = skipSpaces(line, index);
      if (!isIdentifierStart(line[index])) break;

      const nameStart = index;
      let name = "";
      while (isIdentifierPart(line[index])) {
        name += line[index];
        index += 1;
      }
      const nameColumn = nameStart + 1;
      const nameEndColumn = nameStart + name.length + 1;

      index = skipSpaces(line, index);
      if (line[index] === "(") {
        index = skipStatement(line, index);
        break;
      }

      let isArray = false;
      let arrayLength: number | null = null;
      if (line[index] === "[") {
        const size = readArraySize(line, index);
        if (!size.ok) {
          report(size.column, size.endColumn, size.message, size.severity);
          index = skipStatement(line, index);
          break;
        }
        isArray = true;
        arrayLength = size.length;
        index = skipSpaces(line, size.end);
        if (line[index] === "[") {
          report(nameColumn, nameEndColumn, "Multi-dimensional arrays are not allocated in this lesson.", "warning");
          index = skipStatement(line, index);
          break;
        }
      }

      let valid = true;
      let value: string | null = null;
      let valueColumn = index + 1;
      let valueEndColumn = index + 2;
      if (line[index] === "=") {
        const equalsAt = index;
        index += 1;
        const valueStart = skipSpaces(text, index);
        index = readInitializer(line, index);
        value = text.slice(valueStart, index).trim();
        valueColumn = valueStart + 1;
        valueEndColumn = Math.max(valueColumn + 1, valueStart + value.length + 1);
        if (!value) {
          report(equalsAt + 1, equalsAt + 2, "Expected initializer", "error");
          value = null;
          valid = false;
        }
      }

      let elements: string[] | null = null;
      if (isArray && valid) {
        if (value !== null) {
          const initializer = readArrayInitializer(typeMatch.type, value);
          if (!initializer.ok) {
            report(valueColumn, valueEndColumn, initializer.message, initializer.severity);
            valid = false;
          } else {
            elements = initializer.elements;
            if (arrayLength === null) {
              arrayLength = elements.length;
            } else if (initializer.fromString && elements.length === arrayLength + 1) {
              elements.pop();
            }
            if (arrayLength === 0) {
              report(nameColumn, nameEndColumn, "An array needs at least one element.", "error");
              valid = false;
            } else if (elements.length > arrayLength) {
              const message = initializer.fromString
                ? `String is too long for ${name}[${arrayLength}].`
                : `Too many initializers for ${name}[${arrayLength}].`;
              report(valueColumn, valueEndColumn, message, "error");
              valid = false;
            }
          }
        } else if (arrayLength === null) {
          report(nameColumn, nameEndColumn, `Array size is missing. Write ${name}[5] or add an initializer.`, "error");
          valid = false;
        }
      }

      if (valid && seen.has(name)) {
        report(nameColumn, nameEndColumn, `Duplicate variable declaration: ${name}`, "error");
      } else if (valid) {
        seen.add(name);
        const elementSize = C_TYPE_SIZES[typeMatch.type];
        const length = isArray ? (arrayLength ?? 1) : null;
        variables.push({
          name,
          type: typeMatch.type,
          value,
          sizeInBytes: elementSize * (length ?? 1),
          elementSize,
          arrayLength: length,
          elements: isArray ? elements : null,
          lineNumber,
          column: nameColumn,
          endColumn: nameEndColumn,
        });
      }

      index = skipSpaces(line, index);
      if (line[index] === ",") {
        index += 1;
        continue;
      }
      if (line[index] === ";") index += 1;
      break;
    }
  }
}

function readArraySize(line: string, open: number): ArraySize {
  const close = line.indexOf("]", open);
  if (close === -1) {
    return { ok: false, message: "Expected ] after the array size.", severity: "error", column: open + 1, endColumn: open + 2 };
  }
  const inner = line.slice(open + 1, close).trim();
  const span = { column: open + 1, endColumn: close + 2 };
  if (!inner) return { ok: true, length: null, end: close + 1 };

  const match = /^(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9]\d*)[uUlL]*$/.exec(inner);
  if (!match) {
    return {
      ok: false,
      message: "Array size must be a number in this lesson, for example [5].",
      severity: "warning",
      ...span,
    };
  }
  const digits = match[1];
  const length = /^0[xX]/.test(digits)
    ? Number.parseInt(digits.slice(2), 16)
    : digits.length > 1 && digits.startsWith("0")
      ? Number.parseInt(digits, 8)
      : Number(digits);
  if (length === 0) return { ok: false, message: "Array size must be greater than 0.", severity: "error", ...span };
  if (!Number.isSafeInteger(length) || length > MAX_ARRAY_LENGTH) {
    return { ok: false, message: "Array size is too large.", severity: "error", ...span };
  }
  return { ok: true, length, end: close + 1 };
}

function readArrayInitializer(type: CDataType, raw: string): ArrayInitializer {
  if (raw.startsWith("{")) {
    if (!raw.endsWith("}")) return { ok: false, message: "Expected } to close the array initializer.", severity: "error" };
    const items = splitTopLevel(raw.slice(1, -1));
    if (items.length > 0 && items[items.length - 1] === "") items.pop();
    for (const item of items) {
      if (!item) return { ok: false, message: "Expected a value between commas.", severity: "error" };
      if (item.startsWith("{")) {
        return {
          ok: false,
          message: "Nested braces are for multi-dimensional arrays, which are not allocated in this lesson.",
          severity: "warning",
        };
      }
      if (item.startsWith("[") || item.startsWith(".")) {
        return { ok: false, message: "Designated initializers are not supported in this lesson.", severity: "warning" };
      }
    }
    return { ok: true, elements: items, fromString: false };
  }

  if (raw.startsWith('"')) {
    if (type !== "char") return { ok: false, message: "Only a char array can be initialized with a string.", severity: "error" };
    const bytes = decodeStringLiteral(raw);
    if (!bytes) return { ok: false, message: 'Expected a string literal, for example "hello".', severity: "error" };
    return { ok: true, elements: [...bytes.map(charLiteral), "'\\0'"], fromString: true };
  }

  return { ok: false, message: "An array initializer needs braces, for example {1, 2, 3}.", severity: "error" };
}

function splitTopLevel(source: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let quote: "'" | '"' | null = null;
  let current = "";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      current += character;
      if (character === "\\" && index + 1 < source.length) {
        index += 1;
        current += source[index];
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === "(" || character === "[" || character === "{") depth += 1;
    else if (character === ")" || character === "]" || character === "}") depth = Math.max(0, depth - 1);
    else if (character === "," && depth === 0) {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  items.push(current.trim());
  return items;
}

const STRING_ESCAPES: Record<string, number> = {
  n: 10,
  t: 9,
  r: 13,
  "0": 0,
  "\\": 92,
  "'": 39,
  '"': 34,
  "?": 63,
  a: 7,
  b: 8,
  f: 12,
  v: 11,
};

function decodeStringLiteral(raw: string): number[] | null {
  const match = /^"((?:[^"\\]|\\.)*)"$/.exec(raw);
  if (!match) return null;
  const body = match[1];
  const bytes: number[] = [];
  const encoder = new TextEncoder();

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character !== "\\") {
      bytes.push(...encoder.encode(character));
      continue;
    }
    const next = body[index + 1];
    if (next === "x") {
      const hex = /^[0-9a-fA-F]{1,2}/.exec(body.slice(index + 2));
      if (!hex) return null;
      bytes.push(Number.parseInt(hex[0], 16));
      index += 1 + hex[0].length;
      continue;
    }
    const octal = /^[0-7]{1,3}/.exec(body.slice(index + 1));
    if (octal) {
      bytes.push(Number.parseInt(octal[0], 8) & 0xff);
      index += octal[0].length;
      continue;
    }
    bytes.push(STRING_ESCAPES[next] ?? next.charCodeAt(0));
    index += 1;
  }

  return bytes;
}

function charLiteral(code: number): string {
  if (code === 0) return "'\\0'";
  if (code === 10) return "'\\n'";
  if (code === 9) return "'\\t'";
  if (code === 13) return "'\\r'";
  if (code === 39) return "'\\''";
  if (code === 92) return "'\\\\'";
  if (code >= 32 && code <= 126) return `'${String.fromCharCode(code)}'`;
  return `'\\x${code.toString(16).padStart(2, "0")}'`;
}

function matchType(line: string, index: number): { type: CDataType; raw: string } | null {
  const rest = line.slice(index);
  const longLong = /^long\s+long(?![A-Za-z0-9_])/.exec(rest);
  if (longLong) return { type: "long long", raw: longLong[0] };

  for (const type of SIMPLE_TYPES) {
    if (rest.startsWith(type) && !isIdentifierPart(rest[type.length])) {
      return { type, raw: type };
    }
  }
  return null;
}

function skipPlainToken(line: string, index: number): number {
  if (isIdentifierStart(line[index])) {
    let cursor = index + 1;
    while (isIdentifierPart(line[cursor])) cursor += 1;
    return cursor;
  }
  return index + 1;
}

function skipStatement(line: string, index: number): number {
  let cursor = index;
  while (cursor < line.length && line[cursor] !== ";") cursor += 1;
  return Math.min(line.length, cursor + 1);
}

function readInitializer(line: string, index: number): number {
  let cursor = index;
  let depth = 0;
  let quote: "'" | '"' | null = null;

  while (cursor < line.length) {
    const character = line[cursor];
    if (quote) {
      if (character === "\\") {
        cursor += 2;
        continue;
      }
      if (character === quote) quote = null;
      cursor += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      cursor += 1;
      continue;
    }
    if (character === "(" || character === "[" || character === "{") depth += 1;
    else if (character === ")" || character === "]" || character === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (character === "," || character === ";")) break;
    cursor += 1;
  }

  return cursor;
}
