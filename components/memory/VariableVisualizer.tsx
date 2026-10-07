"use client";

import { useState, type ReactNode } from "react";

import { formatHexAddress } from "@/lib/memory/address-utils";
import type { CVariable } from "@/lib/memory/memory-types";

type VariableVisualizerProps = {
  variable: CVariable;
  digits: number;
};

type CalloutId = "name" | "type" | "size" | "value" | "address";

const CALLOUTS: Record<CalloutId, { label: string; direction: "right" | "left" | "up" }> = {
  name: { label: "variable name", direction: "right" },
  type: { label: "data type", direction: "left" },
  size: { label: "size", direction: "right" },
  value: { label: "value", direction: "up" },
  address: { label: "memory address", direction: "right" },
};

export function VariableVisualizer({ variable, digits }: VariableVisualizerProps) {
  const [callout, setCallout] = useState<CalloutId | null>(null);
  const sizeLabel = variable.sizeInBytes === 1 ? "1 byte" : `${variable.sizeInBytes} bytes`;
  const valueLabel = variable.value ?? "uninitialized";
  const addressLabel = formatHexAddress(variable.startAddress, digits);

  function toggle(id: CalloutId) {
    setCallout((current) => (current === id ? null : id));
  }

  return (
    <div className="variable-visualizer flex h-full min-h-0 flex-1 items-center justify-center overflow-auto px-10 py-8">
      <div className="flex flex-col items-center gap-8">
        <p className="rounded-md bg-white px-4 py-2 font-mono text-xl shadow-sm dark:bg-zinc-900">
          <span className="text-[#7c3aed]">{variable.type}</span>{" "}
          <span className="text-[#3cb043]">{variable.name}</span>
          {variable.value === null ? (
            <span className="text-neutral-900 dark:text-neutral-100">;</span>
          ) : (
            <span className="text-neutral-900 dark:text-neutral-100"> = {variable.value};</span>
          )}
        </p>
        <div className="grid grid-cols-[auto_auto_auto] items-center justify-center gap-x-8 gap-y-6">
          <PartButton
            id="name"
            active={callout}
            onToggle={toggle}
            className="col-start-2 justify-self-center font-mono text-3xl text-[#3cb043] sm:text-4xl"
          >
            {variable.name}
          </PartButton>
          <PartButton
            id="type"
            active={callout}
            onToggle={toggle}
            className="col-start-1 row-start-2 justify-self-end font-mono text-3xl text-[#7c3aed] sm:text-5xl"
          >
            {variable.type}
          </PartButton>
          <PartButton
            id="value"
            active={callout}
            onToggle={toggle}
            className="col-start-2 row-start-2 w-72 justify-self-center border-2 border-neutral-500 bg-white px-6 py-8 sm:w-80"
          >
            <span
              className={
                variable.value === null
                  ? "text-center font-sans text-xl font-medium text-neutral-500 sm:text-2xl"
                  : "text-center font-sans text-5xl font-semibold break-all text-neutral-900 sm:text-7xl"
              }
            >
              {valueLabel}
            </span>
          </PartButton>
          <PartButton
            id="size"
            active={callout}
            onToggle={toggle}
            className="col-start-3 row-start-2 justify-self-start font-mono text-3xl text-[#3b82f6] sm:text-5xl"
          >
            {sizeLabel}
          </PartButton>
          <PartButton
            id="address"
            active={callout}
            onToggle={toggle}
            className="col-start-2 row-start-3 justify-self-center font-mono text-3xl text-[#f97316] sm:text-4xl"
          >
            {addressLabel}
          </PartButton>
        </div>
      </div>
    </div>
  );
}

function PartButton({
  id,
  active,
  onToggle,
  className,
  children,
}: {
  id: CalloutId;
  active: CalloutId | null;
  onToggle: (id: CalloutId) => void;
  className: string;
  children: ReactNode;
}) {
  const callout = CALLOUTS[id];
  const pressed = active === id;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${callout.label}. Click to ${pressed ? "hide" : "show"} the label.`}
      onClick={() => onToggle(id)}
      className={`relative flex cursor-pointer items-center justify-center rounded-md ${className}`}
    >
      {children}
      {pressed ? <Meaning label={callout.label} direction={callout.direction} /> : null}
    </button>
  );
}

function Meaning({ label, direction }: { label: string; direction: "right" | "left" | "up" }) {
  if (direction === "up") {
    return (
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 flex-col items-center gap-1 text-base font-medium whitespace-nowrap text-neutral-800 dark:text-neutral-100">
        <span>{label}</span>
        <Arrow direction="down" />
      </span>
    );
  }

  const toRight = direction === "right";

  return (
    <span
      className={`pointer-events-none absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 text-base font-medium whitespace-nowrap text-neutral-800 dark:text-neutral-100 ${
        toRight ? "left-full ml-2" : "right-full mr-2 flex-row-reverse"
      }`}
    >
      <Arrow direction={toRight ? "right" : "left"} />
      <span>{label}</span>
    </span>
  );
}

function Arrow({ direction }: { direction: "right" | "left" | "down" }) {
  if (direction === "down") {
    return (
      <svg width="18" height="28" viewBox="0 0 18 28" aria-hidden className="text-neutral-700 dark:text-neutral-200">
        <line x1="9" y1="1" x2="9" y2="18" stroke="currentColor" strokeWidth="2" />
        <polyline points="3,16 9,26 15,16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  const points = direction === "right" ? "34,3 46,8 34,13" : "14,3 2,8 14,13";
  const x2 = direction === "right" ? 40 : 8;

  return (
    <svg width="48" height="16" viewBox="0 0 48 16" aria-hidden className="text-neutral-700 dark:text-neutral-200">
      <line x1={direction === "right" ? 0 : 48} y1="8" x2={x2} y2="8" stroke="currentColor" strokeWidth="2" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
