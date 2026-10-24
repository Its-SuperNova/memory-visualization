"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import type { IterationRow } from "@/lib/loop/loop-steps";

type IterationTableProps = {
  variable: string;
  rows: readonly IterationRow[];
  activeIteration: number | null;
  conditionText: string;
  updateText: string;
  printHeader: string;
};

export function IterationTable({
  variable,
  rows,
  activeIteration,
  conditionText,
  updateText,
  printHeader,
}: IterationTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLTableRowElement>(null);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const row = activeRef.current;
    if (!container || !row) return;
    const header = container.querySelector("thead")?.getBoundingClientRect().height ?? 0;
    const top = row.offsetTop - header;
    const bottom = row.offsetTop + row.offsetHeight;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight;
    }
  }, [activeIteration, rows.length]);

  return (
    <div ref={scrollRef} className="minimal-scroll max-h-80 overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-[30rem] border-collapse text-center text-sm">
        <thead className="sticky top-0 z-10 bg-muted text-xs text-foreground">
          <tr>
            <Th>Iteration</Th>
            <Th>Current value</Th>
            <Th>Condition ({conditionText})</Th>
            <Th>{printHeader}</Th>
            <Th>Update ({updateText})</Th>
          </tr>
        </thead>
        <tbody className="font-mono text-[13px]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 font-sans text-xs text-muted-foreground">
                Rows appear here as the loop runs.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const active = row.iteration === activeIteration;
              return (
                <tr
                  key={row.iteration}
                  ref={active ? activeRef : undefined}
                  aria-current={active ? "step" : undefined}
                  className={`border-t border-border ${
                    active ? "bg-primary/10 outline outline-1 -outline-offset-1 outline-primary/50" : "bg-card"
                  }`}
                >
                  <Td>{row.final ? <span className="font-sans text-xs text-muted-foreground">exit</span> : row.iteration}</Td>
                  <Td>
                    {variable} = {row.value}
                  </Td>
                  <Td>
                    {row.condition.text} →{" "}
                    <span
                      className={`font-sans font-semibold ${
                        row.condition.result ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {row.condition.result ? "True" : "False"}
                    </span>
                  </Td>
                  <Td>{row.final ? <Muted>not run</Muted> : row.printed === null ? <Muted>…</Muted> : printable(row.printed)}</Td>
                  <Td>
                    {row.final ? (
                      <Muted>loop ends</Muted>
                    ) : row.update === null ? (
                      <Muted>…</Muted>
                    ) : (
                      `${variable} = ${row.update.to}`
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="border-b border-border px-2 py-2.5 font-medium whitespace-nowrap">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-2 py-2.5 whitespace-nowrap">{children}</td>;
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="font-sans text-xs text-muted-foreground">{children}</span>;
}

function printable(text: string): string {
  const shown = text.replace(/\n/g, "\\n").replace(/\t/g, "\\t").trim();
  return shown === "" ? '""' : shown;
}
