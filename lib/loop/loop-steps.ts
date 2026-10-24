import { EvaluationError } from "@/lib/loop/expression";
import type { ComparisonOperator, ForLoopProgram } from "@/lib/loop/for-loop-parser";

export const MAX_ITERATIONS = 50;
const MAX_OUTPUT_LENGTH = 4000;

export type ConditionCheck = { text: string; result: boolean };

/** One thing the program does. The loop is fully simulated up front, so the player only moves an index. */
export type LoopStep =
  | { kind: "init"; line: number; iteration: number; value: number; output: string }
  | { kind: "check"; line: number; iteration: number; value: number; output: string; condition: ConditionCheck }
  | {
      kind: "body";
      line: number;
      iteration: number;
      value: number;
      output: string;
      statementIndex: number;
      printed: string;
    }
  | { kind: "update"; line: number; iteration: number; value: number; output: string; from: number; to: number }
  | { kind: "done"; line: number; iteration: number; value: number; output: string };

export type LoopRun = {
  program: ForLoopProgram;
  steps: LoopStep[];
  /** Number of times the body ran. */
  iterations: number;
};

export type LoopRunResult = { ok: true; run: LoopRun } | { ok: false; error: string; line: number | null };

export type IterationRow = {
  iteration: number;
  value: number;
  condition: ConditionCheck;
  printed: string | null;
  update: { from: number; to: number } | null;
  final: boolean;
};

export function simulateForLoop(program: ForLoopProgram): LoopRunResult {
  const steps: LoopStep[] = [];
  let value = program.initValue;
  let output = "";
  let iteration = 1;

  try {
    steps.push({ kind: "init", line: program.forLine, iteration, value, output });

    for (;;) {
      const result = compare(program.condition.left(value), program.condition.operator, program.condition.right(value));
      steps.push({
        kind: "check",
        line: program.forLine,
        iteration,
        value,
        output,
        condition: { text: conditionText(program, value), result },
      });
      if (!result) break;
      if (iteration > MAX_ITERATIONS) {
        return {
          ok: false,
          error: `This loop runs more than ${MAX_ITERATIONS} times (it may never stop). Use a smaller range so every step can be shown.`,
          line: program.forLine,
        };
      }

      program.statements.forEach((statement, statementIndex) => {
        const printed = statement.pieces.reduce(
          (text, piece, index) => text + piece + (index < statement.args.length ? String(statement.args[index](value)) : ""),
          "",
        );
        output = (output + printed).slice(-MAX_OUTPUT_LENGTH);
        steps.push({ kind: "body", line: statement.line, iteration, value, output, statementIndex, printed });
      });

      const next = program.update(value);
      steps.push({ kind: "update", line: program.forLine, iteration, value: next, output, from: value, to: next });
      value = next;
      iteration += 1;
    }
  } catch (error) {
    if (error instanceof EvaluationError) return { ok: false, error: error.message, line: program.forLine };
    throw error;
  }

  steps.push({ kind: "done", line: program.exitLine, iteration, value, output });
  return { ok: true, run: { program, steps, iterations: iteration - 1 } };
}

/** Table rows for everything that has happened up to and including stepIndex. */
export function iterationRows(steps: readonly LoopStep[], stepIndex: number): IterationRow[] {
  const rows: IterationRow[] = [];
  for (let index = 0; index <= stepIndex && index < steps.length; index += 1) {
    const step = steps[index];
    const last = rows[rows.length - 1];
    if (step.kind === "check") {
      rows.push({
        iteration: step.iteration,
        value: step.value,
        condition: step.condition,
        printed: null,
        update: null,
        final: !step.condition.result,
      });
    } else if (step.kind === "body" && last) {
      last.printed = (last.printed ?? "") + step.printed;
    } else if (step.kind === "update" && last) {
      last.update = { from: step.from, to: step.to };
    }
  }
  return rows;
}

export function findStep<K extends LoopStep["kind"]>(
  steps: readonly LoopStep[],
  kind: K,
  iteration: number,
): Extract<LoopStep, { kind: K }> | null {
  const step = steps.find((item) => item.kind === kind && item.iteration === iteration);
  return (step as Extract<LoopStep, { kind: K }> | undefined) ?? null;
}

function compare(left: number, operator: ComparisonOperator, right: number): boolean {
  switch (operator) {
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "==":
      return left === right;
    case "!=":
      return left !== right;
  }
}

function conditionText(program: ForLoopProgram, value: number): string {
  const substitute = (text: string) =>
    text.replace(new RegExp(`\\b${program.variable}\\b`, "g"), value < 0 ? `(${value})` : String(value));
  return `${substitute(program.conditionLeftText)} ${program.condition.operator} ${substitute(program.conditionRightText)}`;
}
