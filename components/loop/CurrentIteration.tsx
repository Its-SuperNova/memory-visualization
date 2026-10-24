import { Fragment, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { ACTIVE_RING, TONE } from "@/components/loop/loop-tones";
import { findStep, type LoopRun } from "@/lib/loop/loop-steps";

type CurrentIterationProps = {
  run: LoopRun;
  index: number;
};

export function CurrentIteration({ run, index }: CurrentIterationProps) {
  const { program, steps } = run;
  const step = index >= 0 ? steps[index] : null;
  const iteration = step?.iteration ?? 1;
  const check = findStep(steps, "check", iteration);
  const update = findStep(steps, "update", iteration);
  const checkReached = check !== null && step !== null && index >= steps.indexOf(check);
  const finalCheck = check !== null && !check.condition.result;
  const value = step === null ? null : step.kind === "init" ? step.value : (check?.value ?? step.value);
  const printed = steps
    .slice(0, index + 1)
    .flatMap((item) => (item.kind === "body" && item.iteration === iteration ? [item.printed] : []))
    .join("");
  const statement =
    step?.kind === "body" ? program.statements[step.statementIndex] : (program.statements[0] ?? null);

  const activeCard =
    step === null ? null : { init: 0, check: 1, body: 2, update: 3, done: null }[step.kind];

  const cards: ReactNode[] = [
    <Card key="value" tone={TONE.neutral} active={activeCard === 0}>
      <p className="font-mono text-2xl font-semibold text-foreground">
        {program.variable} = {value ?? "?"}
      </p>
      {step === null || step.kind === "init" ? (
        <Caption title="Initialization" detail={program.initText} />
      ) : (
        <Caption title="Check condition" detail={check?.condition.text ?? program.conditionText} />
      )}
    </Card>,
    <Card
      key="condition"
      tone={checkReached ? (finalCheck ? TONE.conditionFalse : TONE.condition) : TONE.neutral}
      active={activeCard === 1}
    >
      <p className="text-xs">Condition is</p>
      <p className="text-xl font-semibold">{checkReached ? (finalCheck ? "False" : "True") : "?"}</p>
    </Card>,
    <Card key="execute" tone={finalCheck && checkReached ? TONE.neutral : TONE.execute} active={activeCard === 2}>
      {finalCheck && checkReached ? (
        <>
          <p className="text-sm font-semibold text-muted-foreground">Body skipped</p>
          <p className="text-[11px] text-muted-foreground">the loop stops</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">Execute</p>
          <code className="max-w-full font-mono text-xs leading-4 break-all text-foreground">
            {statement?.text ?? "empty body"}
          </code>
          {printed ? (
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              prints &quot;{visible(printed)}&quot;
            </p>
          ) : null}
        </>
      )}
    </Card>,
    <Card key="update" tone={finalCheck && checkReached ? TONE.neutral : TONE.update} active={activeCard === 3}>
      {finalCheck && checkReached ? (
        <>
          <p className="text-sm font-semibold text-muted-foreground">Loop ends</p>
          <p className="text-[11px] text-muted-foreground">no update</p>
        </>
      ) : (
        <>
          <p className="text-sm">Update</p>
          <code className="font-mono text-base font-semibold text-foreground">{program.updateText}</code>
          {update ? (
            <p className="text-[11px]">
              ({program.variable} becomes {update.to})
            </p>
          ) : null}
        </>
      )}
    </Card>,
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch sm:gap-2">
        {cards.map((card, cardIndex) => (
          <Fragment key={cardIndex}>
            {cardIndex > 0 ? (
              <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground sm:block" aria-hidden />
            ) : null}
            {card}
          </Fragment>
        ))}
      </div>
      {step === null ? (
        <p className="text-xs text-muted-foreground">Press Start or Step to run the loop one step at a time.</p>
      ) : step.kind === "done" ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-foreground">
          Loop finished after {run.iterations} iteration{run.iterations === 1 ? "" : "s"}. The condition{" "}
          <code className="font-mono">{check?.condition.text}</code> is false, so the program continues after the loop.
        </p>
      ) : null}
    </div>
  );
}

function Card({ tone, active, children }: { tone: string; active: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-3 text-center transition-all sm:flex-1 ${tone} ${
        active ? ACTIVE_RING : "opacity-85"
      }`}
      aria-current={active ? "step" : undefined}
    >
      {children}
    </div>
  );
}

function Caption({ title, detail }: { title: string; detail: string }) {
  return (
    <p className="text-[11px] leading-4 text-primary">
      {title}
      <br />
      <code className="font-mono">{detail}</code>
    </p>
  );
}

function visible(text: string): string {
  return text.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}
