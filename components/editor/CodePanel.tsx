"use client";

import { X } from "lucide-react";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { VariableDetails } from "@/components/editor/VariableDetails";
import { Button } from "@/components/ui/button";
import type { ParseIssue } from "@/lib/c-parser/c-types";
import type { AddressFormat } from "@/lib/memory/address-utils";
import type { CVariable } from "@/lib/memory/memory-types";

type CodePanelProps = {
  compactTab: "memory" | "code" | "variables";
  code: string;
  variables: readonly CVariable[];
  issues: readonly ParseIssue[];
  allocationError: string | null;
  addressFormat: AddressFormat;
  selectedVariableId: string | null;
  focusToken: number;
  onCodeChange: (code: string) => void;
  onSelectLine: (lineNumber: number, column: number) => void;
  onSelectVariable: (variable: CVariable) => void;
  onShowAllVariables: () => void;
  onClose: () => void;
  visualizerVariableId: string | null;
  onToggleVisualizer: (variable: CVariable) => void;
};

export function CodePanel({
  compactTab,
  code,
  variables,
  issues,
  allocationError,
  addressFormat,
  selectedVariableId,
  focusToken,
  onCodeChange,
  onSelectLine,
  onSelectVariable,
  onShowAllVariables,
  onClose,
  visualizerVariableId,
  onToggleVisualizer,
}: CodePanelProps) {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col border-border bg-background lg:border-l">
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <h2 className="text-xs font-medium text-foreground">
          <span className="lg:hidden">{compactTab === "variables" ? "Variables" : "C Code"}</span>
          <span className="hidden lg:inline">C Code</span>
        </h2>
        <Button variant="ghost" size="icon-xs" aria-label="Close C code editor" onClick={onClose}>
          <X />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`min-h-0 flex-[7] ${compactTab === "variables" ? "max-lg:hidden" : ""}`}>
            <CodeEditor
              code={code}
              variables={variables}
              issues={issues}
              selectedVariableId={selectedVariableId}
              focusToken={focusToken}
              onCodeChange={onCodeChange}
              onSelectLine={onSelectLine}
            />
          </div>
          <div
            className={`min-h-0 flex-[3] overflow-hidden border-t border-border ${compactTab === "code" ? "max-lg:hidden" : "max-lg:flex-1 max-lg:border-t-0"}`}
          >
            <VariableDetails
              variables={variables}
              issues={issues}
              allocationError={allocationError}
              addressFormat={addressFormat}
              selectedVariableId={selectedVariableId}
              onSelect={onSelectVariable}
              onShowAll={onShowAllVariables}
              visualizerVariableId={visualizerVariableId}
              onToggleVisualizer={onToggleVisualizer}
            />
          </div>
      </div>
    </aside>
  );
}
