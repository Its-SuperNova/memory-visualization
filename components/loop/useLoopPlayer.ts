"use client";

import { useCallback, useEffect, useState } from "react";

export const DEFAULT_SPEED = 500;
export const MIN_SPEED = 100;
export const MAX_SPEED = 2000;

/**
 * Moves through a precomputed list of steps. Index -1 means the program has not started.
 * Only one interval exists at a time because it lives in a single effect keyed on playback.
 */
export function useLoopPlayer(stepCount: number) {
  const [index, setIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [clearedLength, setClearedLength] = useState(0);

  const last = stepCount - 1;
  const started = index >= 0;
  const finished = stepCount > 0 && index >= last;
  const playing = running && !finished && stepCount > 0;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => Math.min(current + 1, last));
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, last]);

  const reset = useCallback(() => {
    setRunning(false);
    setIndex(-1);
    setClearedLength(0);
  }, []);

  const start = useCallback(() => {
    if (stepCount === 0) return;
    setRunning(false);
    setClearedLength(0);
    setIndex(0);
  }, [stepCount]);

  const step = useCallback(() => {
    if (stepCount === 0) return;
    setRunning(false);
    setIndex((current) => Math.min(current + 1, last));
  }, [last, stepCount]);

  const toggleAutoRun = useCallback(() => {
    if (stepCount === 0) return;
    if (playing) {
      setRunning(false);
      return;
    }
    setIndex((current) => (current < 0 ? 0 : current));
    setRunning(true);
  }, [playing, stepCount]);

  const clearOutput = useCallback((outputLength: number) => {
    setClearedLength(outputLength);
  }, []);

  return {
    index,
    speed,
    started,
    finished,
    playing,
    clearedLength,
    setSpeed,
    reset,
    start,
    step,
    toggleAutoRun,
    clearOutput,
  };
}
