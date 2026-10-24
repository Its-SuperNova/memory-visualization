export type Evaluator = (value: number) => number;

export type ExpressionResult = { ok: true; evaluate: Evaluator } | { ok: false; error: string };

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; name: string }
  | { kind: "op"; op: string };

export class EvaluationError extends Error {}

/**
 * Parses a small integer expression: literals, the loop variable, + - * / %, unary minus and parentheses.
 * Arithmetic follows C int rules: 32-bit wrap-around and division that truncates toward zero.
 */
export function parseExpression(source: string, variable: string | null): ExpressionResult {
  const tokens = tokenize(source);
  if (typeof tokens === "string") return { ok: false, error: tokens };
  if (tokens.length === 0) return { ok: false, error: "An expression is missing." };

  let position = 0;
  const peek = () => tokens[position];
  const takeOp = (ops: readonly string[]) => {
    const token = tokens[position];
    if (token?.kind === "op" && ops.includes(token.op)) {
      position += 1;
      return token.op;
    }
    return null;
  };

  const parseSum = (): Evaluator | string => {
    const first = parseProduct();
    if (typeof first === "string") return first;
    let left: Evaluator = first;
    for (let op = takeOp(["+", "-"]); op; op = takeOp(["+", "-"])) {
      const right = parseProduct();
      if (typeof right === "string") return right;
      const a: Evaluator = left;
      left = op === "+" ? (value) => (a(value) + right(value)) | 0 : (value) => (a(value) - right(value)) | 0;
    }
    return left;
  };

  const parseProduct = (): Evaluator | string => {
    const first = parseUnary();
    if (typeof first === "string") return first;
    let left: Evaluator = first;
    for (let op = takeOp(["*", "/", "%"]); op; op = takeOp(["*", "/", "%"])) {
      const right = parseUnary();
      if (typeof right === "string") return right;
      const a: Evaluator = left;
      if (op === "*") {
        left = (value) => Math.imul(a(value), right(value));
      } else {
        const divide = op === "/";
        left = (value) => {
          const divisor = right(value);
          if (divisor === 0) throw new EvaluationError("Division by zero.");
          const dividend = a(value);
          return divide ? Math.trunc(dividend / divisor) | 0 : (dividend % divisor) | 0;
        };
      }
    }
    return left;
  };

  const parseUnary = (): Evaluator | string => {
    const op = takeOp(["-", "+"]);
    if (op) {
      const operand = parseUnary();
      if (typeof operand === "string") return operand;
      return op === "-" ? (value) => -operand(value) | 0 : operand;
    }
    return parsePrimary();
  };

  const parsePrimary = (): Evaluator | string => {
    const token = peek();
    if (!token) return "The expression ends too early.";
    position += 1;
    if (token.kind === "number") {
      const constant = token.value | 0;
      return () => constant;
    }
    if (token.kind === "name") {
      if (token.name !== variable) {
        return variable
          ? `Unknown name "${token.name}". Only the loop variable ${variable} and numbers can be used.`
          : `Unknown name "${token.name}". Use a number here.`;
      }
      return (value) => value;
    }
    if (token.op === "(") {
      const inner = parseSum();
      if (typeof inner === "string") return inner;
      if (!takeOp([")"])) return "A closing ) is missing.";
      return inner;
    }
    return `Unexpected "${token.op}".`;
  };

  const evaluate = parseSum();
  if (typeof evaluate === "string") return { ok: false, error: evaluate };
  if (position < tokens.length) {
    const token = tokens[position];
    return { ok: false, error: `Unexpected "${token.kind === "op" ? token.op : token.kind === "name" ? token.name : token.value}".` };
  }
  return { ok: true, evaluate };
}

function tokenize(source: string): Token[] | string {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    const hex = /^0[xX][0-9a-fA-F]+/.exec(source.slice(index));
    if (hex) {
      tokens.push({ kind: "number", value: Number.parseInt(hex[0].slice(2), 16) });
      index += hex[0].length;
      continue;
    }
    const decimal = /^\d+/.exec(source.slice(index));
    if (decimal) {
      if (/^[.eE]/.test(source.slice(index + decimal[0].length))) return "Only whole numbers are supported.";
      tokens.push({ kind: "number", value: Number(decimal[0]) });
      index += decimal[0].length;
      continue;
    }
    const name = /^[A-Za-z_]\w*/.exec(source.slice(index));
    if (name) {
      tokens.push({ kind: "name", name: name[0] });
      index += name[0].length;
      continue;
    }
    if ("+-*/%()".includes(character)) {
      tokens.push({ kind: "op", op: character });
      index += 1;
      continue;
    }
    return `"${character}" is not supported in loop expressions.`;
  }
  return tokens;
}
