/**
 * Replaces comments with spaces so every character keeps its line and column.
 * String literal contents are blanked too unless keepStrings is set.
 */
export function stripComments(source: string, keepStrings = false): string {
  let out = "";
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (current === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }

    if (current === "/" && next === "*") {
      out += "  ";
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        out += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      if (index < source.length) out += "  ";
      index += 2;
      continue;
    }

    if (current === "'") {
      out += current;
      index += 1;
      while (index < source.length && source[index] !== "'" && source[index] !== "\n") {
        if (source[index] === "\\" && index + 1 < source.length) {
          out += source[index];
          index += 1;
        }
        out += source[index];
        index += 1;
      }
      if (source[index] === "'") {
        out += "'";
        index += 1;
      }
      continue;
    }

    if (current === '"' && keepStrings) {
      out += current;
      index += 1;
      while (index < source.length && source[index] !== '"' && source[index] !== "\n") {
        if (source[index] === "\\" && index + 1 < source.length) {
          out += source[index];
          index += 1;
        }
        out += source[index];
        index += 1;
      }
      if (source[index] === '"') {
        out += '"';
        index += 1;
      }
      continue;
    }

    if (current === '"') {
      out += " ";
      index += 1;
      while (index < source.length && source[index] !== '"' && source[index] !== "\n") {
        if (source[index] === "\\") {
          out += " ";
          index += 1;
        }
        if (index < source.length) {
          out += source[index] === "\n" ? "\n" : " ";
          index += 1;
        }
      }
      if (source[index] === '"') {
        out += " ";
        index += 1;
      }
      continue;
    }

    out += current;
    index += 1;
  }

  return out;
}

export function isIdentifierStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_]/.test(character);
}

export function isIdentifierPart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_]/.test(character);
}

export function skipSpaces(line: string, index: number): number {
  let cursor = index;
  while (cursor < line.length && /\s/.test(line[cursor])) cursor += 1;
  return cursor;
}
