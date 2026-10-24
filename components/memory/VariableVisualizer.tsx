"use client";

import { useState, type ReactNode } from "react";

import { elementValue } from "@/lib/c-parser/binary-value";
import { formatAddress, type AddressFormat } from "@/lib/memory/address-utils";
import type { CVariable } from "@/lib/memory/memory-types";

type VariableVisualizerProps = {
  variable: CVariable;
  addressFormat: AddressFormat;
};

type Direction = "right" | "left" | "up" | "down";

const MAX_VISUAL_ELEMENTS = 24;

export function VariableVisualizer({ variable, addressFormat }: VariableVisualizerProps) {
  const [callout, setCallout] = useState<string | null>(null);

  function toggle(key: string) {
    setCallout((current) => (current === key ? null : key));
  }

  return (
    <div className="variable-visualizer flex h-full min-h-0 flex-1 items-center justify-center overflow-auto px-10 py-8">
      <div className="flex w-full max-w-5xl flex-col items-center gap-8">
        <Declaration variable={variable} />
        {variable.arrayLength === null ? (
          <ScalarCard variable={variable} addressFormat={addressFormat} callout={callout} onToggle={toggle} />
        ) : (
          <ArrayCard variable={variable} addressFormat={addressFormat} callout={callout} onToggle={toggle} />
        )}
      </div>
    </div>
  );
}

type CardProps = {
  variable: CVariable;
  addressFormat: AddressFormat;
  callout: string | null;
  onToggle: (key: string) => void;
};

function Declaration({ variable }: { variable: CVariable }) {
  return (
    <p className="max-w-full rounded-md bg-white px-4 py-2 font-mono text-xl break-all shadow-sm dark:bg-zinc-900">
      <span className="text-[#7c3aed]">{variable.type}</span>{" "}
      <span className="text-[#3cb043]">{variable.name}</span>
      <span className="text-neutral-900 dark:text-neutral-100">
        {variable.arrayLength === null ? "" : `[${variable.arrayLength}]`}
        {variable.value === null ? ";" : ` = ${variable.value};`}
      </span>
    </p>
  );
}

function ScalarCard({ variable, addressFormat, callout, onToggle }: CardProps) {
  const sizeLabel = variable.sizeInBytes === 1 ? "1 byte" : `${variable.sizeInBytes} bytes`;

  return (
    <div className="grid grid-cols-[auto_auto_auto] items-center justify-center gap-x-8 gap-y-6">
      <PartButton
        calloutKey="name"
        label="variable name"
        direction="right"
        callout={callout}
        onToggle={onToggle}
        className="col-start-2 justify-self-center font-mono text-3xl text-[#3cb043] sm:text-4xl"
      >
        {variable.name}
      </PartButton>
      <PartButton
        calloutKey="type"
        label="data type"
        direction="left"
        callout={callout}
        onToggle={onToggle}
        className="col-start-1 row-start-2 justify-self-end font-mono text-3xl text-[#7c3aed] sm:text-5xl"
      >
        {variable.type}
      </PartButton>
      <PartButton
        calloutKey="value"
        label="value"
        direction="up"
        callout={callout}
        onToggle={onToggle}
        className="col-start-2 row-start-2 w-72 justify-self-center border-2 border-neutral-500 bg-white px-6 py-8 sm:w-80"
      >
        <span
          className={
            variable.value === null
              ? "text-center font-sans text-xl font-medium text-neutral-500 sm:text-2xl"
              : "text-center font-sans text-5xl font-semibold break-all text-neutral-900 sm:text-7xl"
          }
        >
          {variable.value ?? "uninitialized"}
        </span>
      </PartButton>
      <PartButton
        calloutKey="size"
        label="size"
        direction="right"
        callout={callout}
        onToggle={onToggle}
        className="col-start-3 row-start-2 justify-self-start font-mono text-3xl text-[#3b82f6] sm:text-5xl"
      >
        {sizeLabel}
      </PartButton>
      <PartButton
        calloutKey="address"
        label="memory address"
        direction="right"
        callout={callout}
        onToggle={onToggle}
        className="col-start-2 row-start-3 justify-self-center font-mono text-3xl text-[#f97316] sm:text-4xl"
      >
        {formatAddress(variable.startAddress, addressFormat)}
      </PartButton>
    </div>
  );
}

function ArrayCard({ variable, addressFormat, callout, onToggle }: CardProps) {
  const length = variable.arrayLength ?? 0;
  const shown = Math.min(length, MAX_VISUAL_ELEMENTS);
  const sizeLabel = variable.sizeInBytes === 1 ? "1 byte" : `${variable.sizeInBytes} bytes`;
  const elementLabel = variable.elementSize === 1 ? "1 byte" : `${variable.elementSize} bytes`;

  return (
    <div className="flex w-full items-center justify-center gap-6 sm:gap-8">
      <PartButton
        calloutKey="type"
        label="data type of each element"
        direction="left"
        callout={callout}
        onToggle={onToggle}
        className="shrink-0 font-mono text-2xl text-[#7c3aed] sm:text-4xl"
      >
        {variable.type}
      </PartButton>
      <div className="flex min-w-0 flex-col items-center gap-5 sm:max-w-[34rem]">
        <PartButton
          calloutKey="name"
          label="array name"
          direction="right"
          callout={callout}
          onToggle={onToggle}
          className="font-mono text-3xl text-[#3cb043] sm:text-4xl"
        >
          {variable.name}
        </PartButton>
        <div className="flex flex-wrap justify-center gap-y-4 px-px">
          {Array.from({ length: shown }, (_, index) => (
            <ArrayElement
              key={index}
              variable={variable}
              index={index}
              addressFormat={addressFormat}
              callout={callout}
              onToggle={onToggle}
            />
          ))}
          {length > shown ? (
            <div className="-mx-px flex flex-col items-center gap-2">
              <span className="font-mono text-sm text-transparent select-none">[…]</span>
              <span className="flex size-16 items-center justify-center border-2 border-dashed border-neutral-400 bg-white/60 font-mono text-sm text-neutral-500">
                +{length - shown}
              </span>
              <span className="font-mono text-xs text-neutral-500">more</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1">
        <PartButton
          calloutKey="size"
          label="total size"
          direction="right"
          callout={callout}
          onToggle={onToggle}
          className="font-mono text-2xl text-[#3b82f6] sm:text-4xl"
        >
          {sizeLabel}
        </PartButton>
        <span className="font-mono text-sm text-neutral-500">
          {length} × {elementLabel}
        </span>
      </div>
    </div>
  );
}

function ArrayElement({
  variable,
  index,
  addressFormat,
  callout,
  onToggle,
}: {
  variable: CVariable;
  index: number;
  addressFormat: AddressFormat;
  callout: string | null;
  onToggle: (key: string) => void;
}) {
  const value = elementValue(variable, index);
  const text = value ?? "?";
  const textSize = text.length <= 3 ? "text-2xl" : text.length <= 6 ? "text-base" : "text-xs";

  return (
    <div className="-mx-px flex flex-col items-center gap-2">
      <PartButton
        calloutKey={`index:${index}`}
        label="index"
        direction="up"
        callout={callout}
        onToggle={onToggle}
        className="font-mono text-sm text-neutral-600 dark:text-neutral-300"
      >
        [{index}]
      </PartButton>
      <PartButton
        calloutKey={`value:${index}`}
        label={value === null ? "uninitialized element" : "element value"}
        direction="up"
        callout={callout}
        onToggle={onToggle}
        className="size-16 rounded-none border-2 border-neutral-500 bg-white px-1"
      >
        <span
          className={
            value === null
              ? "font-sans text-xl font-medium text-neutral-400"
              : `font-sans ${textSize} font-semibold break-all text-neutral-900`
          }
        >
          {text}
        </span>
      </PartButton>
      <PartButton
        calloutKey={`address:${index}`}
        label="memory address"
        direction="down"
        callout={callout}
        onToggle={onToggle}
        className="font-mono text-xs text-[#f97316]"
      >
        {formatAddress(variable.startAddress + index * variable.elementSize, addressFormat)}
      </PartButton>
    </div>
  );
}

function PartButton({
  calloutKey,
  label,
  direction,
  callout,
  onToggle,
  className,
  children,
}: {
  calloutKey: string;
  label: string;
  direction: Direction;
  callout: string | null;
  onToggle: (key: string) => void;
  className: string;
  children: ReactNode;
}) {
  const pressed = callout === calloutKey;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${label}. Click to ${pressed ? "hide" : "show"} the label.`}
      onClick={() => onToggle(calloutKey)}
      className={`relative flex cursor-pointer items-center justify-center rounded-md ${className}`}
    >
      {children}
      {pressed ? <Meaning label={label} direction={direction} /> : null}
    </button>
  );
}

function Meaning({ label, direction }: { label: string; direction: Direction }) {
  const text = "pointer-events-none absolute z-10 flex items-center gap-1 font-sans text-base font-medium whitespace-nowrap text-neutral-800 dark:text-neutral-100";

  if (direction === "up") {
    return (
      <span className={`${text} bottom-full left-1/2 mb-2 -translate-x-1/2 flex-col`}>
        <span>{label}</span>
        <Arrow direction="down" />
      </span>
    );
  }

  if (direction === "down") {
    return (
      <span className={`${text} top-full left-1/2 mt-2 -translate-x-1/2 flex-col-reverse`}>
        <span>{label}</span>
        <Arrow direction="up" />
      </span>
    );
  }

  const toRight = direction === "right";

  return (
    <span className={`${text} top-1/2 -translate-y-1/2 ${toRight ? "left-full ml-2" : "right-full mr-2 flex-row-reverse"}`}>
      <Arrow direction={toRight ? "right" : "left"} />
      <span>{label}</span>
    </span>
  );
}

function Arrow({ direction }: { direction: Direction }) {
  if (direction === "down" || direction === "up") {
    const down = direction === "down";
    return (
      <svg width="18" height="28" viewBox="0 0 18 28" aria-hidden className="text-neutral-700 dark:text-neutral-200">
        <line x1="9" y1={down ? 1 : 27} x2="9" y2={down ? 18 : 10} stroke="currentColor" strokeWidth="2" />
        <polyline
          points={down ? "3,16 9,26 15,16" : "3,12 9,2 15,12"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
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
