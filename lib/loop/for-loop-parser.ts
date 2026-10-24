import { stripComments } from "@/lib/c-parser/parser-utils";
import { parseExpression, type Evaluator } from "@/lib/loop/expression";

export const DEFAULT_LOOP_PROGRAM = `#include <stdio.h>

int main() {
    for (int i = 1; i <= 5; i++) {
        printf("%d ", i);
    }
    return 0;
}
`;

export type ComparisonOperator = "<" | "<=" | ">" | ">=" | "==" | "!=";

export type PrintStatement = {
  /** Source text without the trailing semicolon, for example printf("%d ", i). */
  text: string;
  line: number;
  /** Format string split around %d placeholders. pieces.length === args.length + 1. */
  pieces: string[];
  args: Evaluator[];
};

export type ForLoopProgram = {
  variable: string;
  initText: string;
  conditionText: string;
  updateText: string;
  initValue: number;
  condition: { left: Evaluator; operator: ComparisonOperator; right: Evaluator };
  conditionLeftText: string;
  conditionRightText: string;
  update: Evaluator;
  statements: PrintStatement[];
  forLine: number;
  /** Line that runs after the loop finishes. */
  exitLine: number;
};

export type LoopParseResult = { ok: true; program: ForLoopProgram } | { ok: false; error: string; line: number | null };

type Range = { start: number; end: number };

const SUPPORTED_EXAMPLE = 'for (int i = 1; i <= 5; i++) { printf("%d ", i); }';

export function parseForLoop(source: string): LoopParseResult {
  const text = stripComments(source, true);
  const mask = maskCharLiterals(stripComments(source));
  if (mask.length !== text.length) return fail("This code could not be read.", null);
  const lineOf = (index: number) => countLines(text, index);

  const loops = [...mask.matchAll(/\bfor\s*\(/g)];
  if (loops.length === 0) {
    return fail(`No for loop found. Write a loop such as ${SUPPORTED_EXAMPLE}`, null);
  }
  if (loops.length > 1) {
    return fail("Only one for loop is supported for now (no nested or repeated loops).", lineOf(loops[1].index));
  }
  if (/\b(while|do|goto)\b/.test(mask)) {
    const other = /\b(while|do|goto)\b/.exec(mask);
    return fail("Only a single for loop is supported. Remove while, do, or goto.", other ? lineOf(other.index) : null);
  }

  const forIndex = loops[0].index;
  const forLine = lineOf(forIndex);
  const open = forIndex + loops[0][0].length - 1;
  const close = matchClose(mask, open, "(", ")");
  if (close < 0) return fail("The for loop header is missing a closing ).", forLine);

  const parts = splitTopLevel(mask, { start: open + 1, end: close }, ";");
  if (parts.length !== 3) {
    return fail("A for loop header needs three parts separated by semicolons: for (init; condition; update).", forLine);
  }
  const [initText, conditionText, updateText] = parts.map((range) => text.slice(range.start, range.end).trim());

  const init =
    /^(?:(?:unsigned\s+|signed\s+)?(?:int|long|short)\s+)?([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(initText);
  if (!init) return fail("The initialization must look like int i = 1.", forLine);
  const variable = init[1];
  const initExpression = parseExpression(init[2], null);
  if (!initExpression.ok) return fail(`Initialization: ${initExpression.error}`, forLine);

  if (/&&|\|\|/.test(conditionText)) {
    return fail("Conditions combined with && or || are not supported yet.", forLine);
  }
  const comparison = /(<=|>=|==|!=|<|>)/.exec(conditionText);
  if (!comparison) return fail(`The condition must compare values, for example ${variable} <= 5.`, forLine);
  const conditionLeftText = conditionText.slice(0, comparison.index).trim();
  const conditionRightText = conditionText.slice(comparison.index + comparison[0].length).trim();
  const left = parseExpression(conditionLeftText, variable);
  if (!left.ok) return fail(`Condition: ${left.error}`, forLine);
  const right = parseExpression(conditionRightText, variable);
  if (!right.ok) return fail(`Condition: ${right.error}`, forLine);

  const update = parseUpdate(updateText, variable);
  if (typeof update === "string") return fail(update, forLine);

  const afterHeader = skipSpaces(mask, close + 1);
  let body: Range;
  let bodyEnd: number;
  if (mask[afterHeader] === "{") {
    const closeBrace = matchClose(mask, afterHeader, "{", "}");
    if (closeBrace < 0) return fail("The loop body is missing a closing }.", forLine);
    body = { start: afterHeader + 1, end: closeBrace };
    bodyEnd = closeBrace + 1;
  } else {
    const semicolon = mask.indexOf(";", afterHeader);
    if (semicolon < 0) return fail("The loop body is missing a ;.", forLine);
    body = { start: afterHeader, end: semicolon + 1 };
    bodyEnd = semicolon + 1;
  }
  if (/[{}]/.test(mask.slice(body.start, body.end))) {
    return fail("Blocks inside the loop body are not supported yet.", lineOf(body.start));
  }

  const pieces = splitTopLevel(mask, body, ";");
  const statements: PrintStatement[] = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    const raw = text.slice(piece.start, piece.end);
    const statementText = raw.trim();
    if (!statementText) continue;
    const start = piece.start + raw.indexOf(statementText);
    const line = lineOf(start);
    if (index === pieces.length - 1) return fail("A statement in the loop body is missing its ;.", line);
    const statement = parsePrintf(text, mask, { start, end: start + statementText.length }, variable, line);
    if (typeof statement === "string") return fail(statement, line);
    statements.push(statement);
  }

  const returnMatch = /\breturn\b/.exec(mask.slice(bodyEnd));
  const exitLine = returnMatch ? lineOf(bodyEnd + returnMatch.index) : lineOf(Math.max(bodyEnd - 1, 0));

  return {
    ok: true,
    program: {
      variable,
      initText,
      conditionText,
      updateText,
      initValue: initExpression.evaluate(0),
      condition: { left: left.evaluate, operator: comparison[0] as ComparisonOperator, right: right.evaluate },
      conditionLeftText,
      conditionRightText,
      update,
      statements,
      forLine,
      exitLine,
    },
  };
}

function parseUpdate(updateText: string, variable: string): Evaluator | string {
  const help = `The update must change ${variable}, for example ${variable}++ or ${variable} += 2.`;
  const increment = /^(?:(\+\+|--)\s*([A-Za-z_]\w*)|([A-Za-z_]\w*)\s*(\+\+|--))$/.exec(updateText);
  if (increment) {
    const name = increment[2] ?? increment[3];
    const op = increment[1] ?? increment[4];
    if (name !== variable) return help;
    return op === "++" ? (value) => (value + 1) | 0 : (value) => (value - 1) | 0;
  }

  const assignment = /^([A-Za-z_]\w*)\s*([+\-*/%]?)=\s*([\s\S]+)$/.exec(updateText);
  if (!assignment || assignment[1] !== variable) return help;
  const expression = parseExpression(assignment[3], variable);
  if (!expression.ok) return `Update: ${expression.error}`;
  const amount = expression.evaluate;
  switch (assignment[2]) {
    case "+":
      return (value) => (value + amount(value)) | 0;
    case "-":
      return (value) => (value - amount(value)) | 0;
    case "*":
      return (value) => Math.imul(value, amount(value));
    case "/":
    case "%": {
      const combined = parseExpression(`${variable} ${assignment[2]} (${assignment[3]})`, variable);
      if (!combined.ok) return `Update: ${combined.error}`;
      return combined.evaluate;
    }
    default:
      return amount;
  }
}

function parsePrintf(
  text: string,
  mask: string,
  range: Range,
  variable: string,
  line: number,
): PrintStatement | string {
  const statementText = text.slice(range.start, range.end);
  const call = /^printf\s*\(/.exec(statementText);
  if (!call || !statementText.endsWith(")")) {
    return `Only printf(...) statements are supported inside the loop body for now.`;
  }
  const argsRange = { start: range.start + call[0].length, end: range.end - 1 };
  if (matchClose(mask, range.start + call[0].length - 1, "(", ")") !== range.end - 1) {
    return "The printf call has unbalanced parentheses.";
  }
  const args = splitTopLevel(mask, argsRange, ",").map((part) => text.slice(part.start, part.end).trim());
  const format = /^"((?:\\.|[^"\\])*)"$/.exec(args[0] ?? "");
  if (!format) return 'printf needs a format string first, for example printf("%d ", i).';

  const decoded = decodeEscapes(format[1]);
  const pieces: string[] = [""];
  for (let index = 0; index < decoded.length; index += 1) {
    const character = decoded[index];
    if (character !== "%") {
      pieces[pieces.length - 1] += character;
      continue;
    }
    const next = decoded[index + 1];
    if (next === "%") {
      pieces[pieces.length - 1] += "%";
      index += 1;
    } else if (next === "d" || next === "i") {
      pieces.push("");
      index += 1;
    } else {
      return `Only %d is supported in printf for now (found %${next ?? ""}).`;
    }
  }

  const values = args.slice(1);
  if (values.length !== pieces.length - 1) {
    return `printf has ${pieces.length - 1} %d placeholder(s) but ${values.length} value(s).`;
  }
  const evaluators: Evaluator[] = [];
  for (const value of values) {
    const expression = parseExpression(value, variable);
    if (!expression.ok) return `printf: ${expression.error}`;
    evaluators.push(expression.evaluate);
  }
  return { text: statementText, line, pieces, args: evaluators };
}

function decodeEscapes(value: string): string {
  return value.replace(/\\(.)/g, (_, character: string) => {
    switch (character) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "0":
        return "";
      default:
        return character;
    }
  });
}

function maskCharLiterals(value: string): string {
  return value.replace(/'(?:\\.|[^'\\\n])*'/g, (literal) => " ".repeat(literal.length));
}

function matchClose(mask: string, openIndex: number, open: string, close: string): number {
  let depth = 0;
  for (let index = openIndex; index < mask.length; index += 1) {
    if (mask[index] === open) depth += 1;
    else if (mask[index] === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitTopLevel(mask: string, range: Range, separator: string): Range[] {
  const parts: Range[] = [];
  let depth = 0;
  let start = range.start;
  for (let index = range.start; index < range.end; index += 1) {
    const character = mask[index];
    if (character === "(" || character === "[" || character === "{") depth += 1;
    else if (character === ")" || character === "]" || character === "}") depth -= 1;
    else if (character === separator && depth === 0) {
      parts.push({ start, end: index });
      start = index + 1;
    }
  }
  parts.push({ start, end: range.end });
  return parts;
}

function skipSpaces(value: string, index: number): number {
  let cursor = index;
  while (cursor < value.length && /\s/.test(value[cursor])) cursor += 1;
  return cursor;
}

function countLines(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text[cursor] === "\n") line += 1;
  }
  return line;
}

function fail(error: string, line: number | null): LoopParseResult {
  return { ok: false, error, line };
}
