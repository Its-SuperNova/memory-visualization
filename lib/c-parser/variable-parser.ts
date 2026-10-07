import { C_TYPE_SIZES, type CDataType, type ParseIssue, type ParseResult, type ParsedVariable } from "@/lib/c-parser/c-types";
import { isIdentifierPart, isIdentifierStart, skipSpaces, stripComments } from "@/lib/c-parser/parser-utils";

const SIMPLE_TYPES = ["char", "short", "int", "long", "float", "double"] as const;

export function parseCVariables(source: string): ParseResult {
  const lines = stripComments(source).split("\n");
  const seen = new Set<string>();
  const variables: ParsedVariable[] = [];
  const issues: ParseIssue[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    parseLine(lines[lineIndex], lineIndex + 1, seen, variables, issues);
  }

  return { variables, issues };
}

function parseLine(
  line: string,
  lineNumber: number,
  seen: Set<string>,
  variables: ParsedVariable[],
  issues: ParseIssue[],
): void {
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
      issues.push({
        lineNumber,
        column: index + 1,
        endColumn: index + 2,
        message: "Pointers are not allocated in this lesson.",
        severity: "warning",
      });
      index = skipStatement(line, index);
      continue;
    }

    if (!isIdentifierStart(line[index])) {
      issues.push({
        lineNumber,
        column: typeStart + 1,
        endColumn: typeStart + typeMatch.raw.length + 1,
        message: "Expected variable name",
        severity: "error",
      });
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

      index = skipSpaces(line, index);
      if (line[index] === "(") {
        index = skipStatement(line, index);
        break;
      }
      if (line[index] === "[") {
        issues.push({
          lineNumber,
          column: nameStart + 1,
          endColumn: nameStart + name.length + 1,
          message: "Arrays are not allocated in this lesson.",
          severity: "warning",
        });
        index = skipStatement(line, index);
        break;
      }

      let value: string | null = null;
      if (line[index] === "=") {
        const equalsAt = index;
        index += 1;
        const valueStart = index;
        index = readInitializer(line, index);
        value = line.slice(valueStart, index).trim();
        if (!value) {
          issues.push({
            lineNumber,
            column: equalsAt + 1,
            endColumn: equalsAt + 2,
            message: "Expected initializer",
            severity: "error",
          });
          value = null;
        }
      }

      if (seen.has(name)) {
        issues.push({
          lineNumber,
          column: nameStart + 1,
          endColumn: nameStart + name.length + 1,
          message: `Duplicate variable declaration: ${name}`,
          severity: "error",
        });
      } else {
        seen.add(name);
        variables.push({
          name,
          type: typeMatch.type,
          value,
          sizeInBytes: C_TYPE_SIZES[typeMatch.type],
          lineNumber,
          column: nameStart + 1,
          endColumn: nameStart + name.length + 1,
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
