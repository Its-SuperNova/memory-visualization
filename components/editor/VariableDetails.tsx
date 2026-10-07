"use client";

import type { ReactNode } from "react";
import { Eye } from "lucide-react";

import { VariableRow } from "@/components/editor/VariableRow";
import { Button } from "@/components/ui/button";
import { formatVariableBinary } from "@/lib/c-parser/binary-value";
import { formatHexAddress } from "@/lib/memory/address-utils";
import type { ParseIssue } from "@/lib/c-parser/c-types";
import type { CVariable } from "@/lib/memory/memory-types";

type VariableDetailsProps = {
  variables: readonly CVariable[];
  issues: readonly ParseIssue[];
  allocationError: string | null;
  digits: number;
  selectedVariableId: string | null;
  onSelect: (variable: CVariable) => void;
  onShowAll: () => void;
  visualizerVariableId: string | null;
  onToggleVisualizer: (variable: CVariable) => void;
};

export function VariableDetails({
  variables,
  issues,
  allocationError,
  digits,
  selectedVariableId,
  onSelect,
  onShowAll,
  visualizerVariableId,
  onToggleVisualizer,
}: VariableDetailsProps) {
  const selected = variables.find((variable) => variable.id === selectedVariableId) ?? null;
  const showingAll = selected === null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" aria-label="Variables">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2 py-1.5" role="tablist" aria-label="Variables">
        <TabButton active={showingAll} onClick={onShowAll}>
          All
        </TabButton>
        {variables.map((variable) => (
          <TabButton
            key={variable.id}
            active={variable.id === selected?.id}
            onClick={() => onSelect(variable)}
          >
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: variable.stroke }} />
            {variable.name}
          </TabButton>
        ))}
      </div>
      {allocationError ? (
        <p className="mx-3 mt-2 border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {allocationError}
        </p>
      ) : null}
      <div className="minimal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {variables.length === 0 ? (
          <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">
            Declare a char, short, int, long, long long, float, or double to allocate memory.
          </p>
        ) : showingAll ? (
          <ul>
            {variables.map((variable) => (
              <li key={variable.id} className="border-b border-border last:border-b-0">
                <VariableRow variable={variable} digits={digits} selected={false} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        ) : (
          <VariableDetail
            variable={selected}
            digits={digits}
            visualizing={visualizerVariableId === selected.id}
            onToggleVisualizer={onToggleVisualizer}
          />
        )}
        {issues.length > 0 ? (
          <ul className="space-y-1 px-3 py-2">
            {issues.map((issue) => (
              <li
                key={`${issue.lineNumber}:${issue.column}:${issue.message}`}
                className={issue.severity === "error" ? "text-[11px] text-destructive" : "text-[11px] text-muted-foreground"}
              >
                Line {issue.lineNumber}: {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function VariableDetail({
  variable,
  digits,
  visualizing,
  onToggleVisualizer,
}: {
  variable: CVariable;
  digits: number;
  visualizing: boolean;
  onToggleVisualizer: (variable: CVariable) => void;
}) {
  const address =
    variable.startAddress === variable.endAddress
      ? formatHexAddress(variable.startAddress, digits)
      : `${formatHexAddress(variable.startAddress, digits)} – ${formatHexAddress(variable.endAddress, digits)}`;
  const binary = formatVariableBinary(variable.type, variable.value, variable.sizeInBytes);

  return (
    <div className="px-3 py-2">
      <p className="flex items-center gap-2 font-mono text-sm text-foreground">
        <span className="size-2 rounded-full" style={{ backgroundColor: variable.stroke }} />
        {variable.name}
        <Button
          variant={visualizing ? "default" : "ghost"}
          size="icon-xs"
          className="ml-auto"
          aria-label={visualizing ? "Show memory grid" : "Show variable visualizer"}
          aria-pressed={visualizing}
          onClick={() => onToggleVisualizer(variable)}
        >
          <Eye />
        </Button>
      </p>
      <dl className="mt-2 space-y-1.5">
        <Detail label="Type" value={variable.type} />
        <Detail label="Value" value={variable.value === null ? "Uninitialized" : variable.value} />
        {binary ? (
          <div>
            <dt className="text-[11px] text-muted-foreground">Binary</dt>
            <dd className="mt-0.5 font-mono text-[11px] leading-4 break-all whitespace-pre-wrap text-foreground">{binary}</dd>
          </div>
        ) : null}
        <Detail label="Size" value={variable.sizeInBytes === 1 ? "1 Byte" : `${variable.sizeInBytes} Bytes`} />
        <Detail label="Address" value={address} />
        <Detail label="Bits" value={String(variable.sizeInBytes * 8)} />
      </dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs text-foreground">{value}</dd>
    </div>
  );
}
