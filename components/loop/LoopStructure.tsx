import type { ReactNode } from "react";

import { ACTIVE_RING, TONE } from "@/components/loop/loop-tones";

export type LoopPart = "init" | "condition" | "update";

type LoopStructureProps = {
  initText: string;
  conditionText: string;
  updateText: string;
  activePart: LoopPart | null;
};

export function LoopStructure({ initText, conditionText, updateText, activePart }: LoopStructureProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-3 font-mono text-base sm:gap-x-3 sm:text-lg">
        <Punctuation>
          <span className="font-semibold text-violet-600 dark:text-violet-400">for</span>&nbsp;(
        </Punctuation>
        <Part
          code={initText}
          label="1. Initialization"
          hint="(runs once)"
          tone={TONE.init}
          active={activePart === "init"}
        />
        <Punctuation>;</Punctuation>
        <Part
          code={conditionText}
          label="2. Condition"
          hint="(checked every time)"
          tone={TONE.condition}
          active={activePart === "condition"}
        />
        <Punctuation>;</Punctuation>
        <Part
          code={updateText}
          label="3. Update"
          hint="(after each iteration)"
          tone={TONE.update}
          active={activePart === "update"}
        />
        <Punctuation>)</Punctuation>
      </div>
    </div>
  );
}

function Punctuation({ children }: { children: ReactNode }) {
  return <span className="flex h-11 items-center text-muted-foreground">{children}</span>;
}

function Part({
  code,
  label,
  hint,
  tone,
  active,
}: {
  code: string;
  label: string;
  hint: string;
  tone: string;
  active: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <code
        className={`flex h-11 max-w-[11rem] items-center truncate rounded-lg border px-3 font-medium transition-shadow sm:px-4 ${tone} ${
          active ? ACTIVE_RING : ""
        }`}
        title={code}
      >
        {code}
      </code>
      <span className="text-center font-sans text-[11px] leading-4 text-muted-foreground">
        {label}
        <br />
        {hint}
      </span>
    </div>
  );
}
