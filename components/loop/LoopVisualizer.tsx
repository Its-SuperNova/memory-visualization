"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, Trash2 } from "lucide-react";

import { CurrentIteration } from "@/components/loop/CurrentIteration";
import { IterationTable } from "@/components/loop/IterationTable";
import { LoopCodeEditor } from "@/components/loop/LoopCodeEditor";
import { LoopControls } from "@/components/loop/LoopControls";
import { LoopStructure, type LoopPart } from "@/components/loop/LoopStructure";
import { OutputConsole } from "@/components/loop/OutputConsole";
import { useLoopPlayer } from "@/components/loop/useLoopPlayer";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOOP_PROGRAM, parseForLoop } from "@/lib/loop/for-loop-parser";
import { iterationRows, simulateForLoop, type LoopRunResult } from "@/lib/loop/loop-steps";

const ACTIVE_PART: Record<string, LoopPart | null> = {
  init: "init",
  check: "condition",
  body: null,
  update: "update",
  done: null,
};

export function LoopVisualizer() {
  const [code, setCode] = useState(DEFAULT_LOOP_PROGRAM);
  const analysis = useMemo<LoopRunResult>(() => {
    const parsed = parseForLoop(code);
    return parsed.ok ? simulateForLoop(parsed.program) : parsed;
  }, [code]);
  const run = analysis.ok ? analysis.run : null;
  const error = useMemo(
    () => (analysis.ok ? null : { message: analysis.error, line: analysis.line }),
    [analysis],
  );

  const player = useLoopPlayer(run?.steps.length ?? 0);
  const step = run && player.index >= 0 ? run.steps[player.index] : null;
  const output = step?.output ?? "";
  const rows = useMemo(() => (run ? iterationRows(run.steps, player.index) : []), [run, player.index]);
  const activeIteration = step && step.kind !== "init" && step.kind !== "done" ? step.iteration : null;

  const onCodeChange = (next: string) => {
    setCode(next);
    player.reset();
  };

  const badge = !run
    ? null
    : step === null
      ? { label: "Not started", tone: "border-border bg-muted text-muted-foreground" }
      : step.kind === "done"
        ? { label: "Completed", tone: "border-primary/30 bg-primary/10 text-primary" }
        : step.kind === "init"
          ? { label: "Initialization", tone: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300" }
          : step.iteration > run.iterations
            ? { label: "Final check", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" }
            : {
                label: `Iteration ${step.iteration} / ${run.iterations}`,
                tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
              };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-12">
          <RefreshCw className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            For Loop <span className="text-primary">Visualizer</span>
          </h2>
          <p className="text-sm text-muted-foreground">See how the for loop works step by step.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section
          aria-label="Code"
          className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:sticky lg:top-6 lg:self-start"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-foreground">Code</h3>
            <Button variant="outline" onClick={() => onCodeChange(DEFAULT_LOOP_PROGRAM)}>
              <RotateCcw />
              Reset
            </Button>
          </div>
          <div className="h-72 overflow-hidden rounded-xl border border-border sm:h-80">
            <LoopCodeEditor code={code} activeLine={step?.line ?? null} error={error} onCodeChange={onCodeChange} />
          </div>
          <div className="border-t border-border pt-4">
            <LoopControls
              disabled={!run}
              started={player.started}
              finished={player.finished}
              playing={player.playing}
              speed={player.speed}
              stepNumber={player.index + 1}
              stepCount={run?.steps.length ?? 0}
              onStart={player.start}
              onStep={player.step}
              onAutoRun={player.toggleAutoRun}
              onReset={player.reset}
              onSpeedChange={player.setSpeed}
            />
          </div>
        </section>

        <section
          aria-label="Visualization"
          className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
        >
          <h3 className="text-lg font-semibold text-foreground">Visualization</h3>

          {!run ? (
            <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">
                  This code can&apos;t be visualized yet{error?.line ? ` (line ${error.line})` : ""}.
                </p>
                <p>{error?.message}</p>
                <p className="text-xs opacity-80">
                  Supported: one for loop whose body uses printf with %d, for example{" "}
                  <code className="font-mono">printf(&quot;%d &quot;, i);</code>
                </p>
              </div>
            </div>
          ) : (
            <>
              <LoopStructure
                initText={run.program.initText}
                conditionText={run.program.conditionText}
                updateText={run.program.updateText}
                activePart={step ? ACTIVE_PART[step.kind] : null}
              />

              <Block
                title="Current Iteration"
                action={
                  badge ? (
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${badge.tone}`}>{badge.label}</span>
                  ) : null
                }
              >
                <CurrentIteration run={run} index={player.index} />
              </Block>

              <Block
                title="Output"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={output.length <= player.clearedLength}
                    onClick={() => player.clearOutput(output.length)}
                  >
                    <Trash2 />
                    Clear
                  </Button>
                }
              >
                <OutputConsole output={output.slice(player.clearedLength)} />
              </Block>

              <Block title="Iteration Table">
                <IterationTable
                  variable={run.program.variable}
                  rows={rows}
                  activeIteration={activeIteration}
                  conditionText={run.program.conditionText}
                  updateText={run.program.updateText}
                  printHeader={run.program.statements.length === 1 ? run.program.statements[0].text : "Printed output"}
                />
              </Block>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}
