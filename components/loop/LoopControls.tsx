"use client";

import { FastForward, Pause, Play, RotateCcw, StepForward } from "lucide-react";

import { MAX_SPEED, MIN_SPEED } from "@/components/loop/useLoopPlayer";
import { Button } from "@/components/ui/button";

type LoopControlsProps = {
  disabled: boolean;
  started: boolean;
  finished: boolean;
  playing: boolean;
  speed: number;
  stepNumber: number;
  stepCount: number;
  onStart: () => void;
  onStep: () => void;
  onAutoRun: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
};

export function LoopControls({
  disabled,
  started,
  finished,
  playing,
  speed,
  stepNumber,
  stepCount,
  onStart,
  onStep,
  onAutoRun,
  onReset,
  onSpeedChange,
}: LoopControlsProps) {
  const inProgress = started && !finished;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">Controls</h3>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {disabled
            ? "Fix the code to run it"
            : finished
              ? "Finished"
              : started
                ? `Step ${stepNumber} of ${stepCount}`
                : "Ready"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button size="lg" className="h-10" disabled={disabled || inProgress} onClick={onStart}>
          <Play />
          {finished ? "Restart" : "Start"}
        </Button>
        <Button size="lg" variant="outline" className="h-10" disabled={disabled || finished} onClick={onStep}>
          <StepForward />
          Step
        </Button>
        <Button
          size="lg"
          variant={playing ? "secondary" : "outline"}
          className="h-10"
          disabled={disabled || finished}
          aria-pressed={playing}
          onClick={onAutoRun}
        >
          {playing ? <Pause /> : <FastForward />}
          {playing ? "Pause" : "Auto Run"}
        </Button>
        <Button size="lg" variant="outline" className="h-10" disabled={!started} onClick={onReset}>
          <RotateCcw />
          Reset
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <label htmlFor="loop-speed" className="text-sm font-medium text-foreground">
          Speed
        </label>
        <input
          id="loop-speed"
          type="range"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={100}
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          aria-valuetext={`${speed} milliseconds between steps`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
        />
        <span className="w-16 text-right font-mono text-sm text-foreground tabular-nums">{speed} ms</span>
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground">Delay between steps during Auto Run.</p>
    </div>
  );
}
