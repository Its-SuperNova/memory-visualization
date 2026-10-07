"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { OnMount } from "@monaco-editor/react";

import { useTheme } from "@/components/theme/ThemeProvider";
import type { ParseIssue } from "@/lib/c-parser/c-types";
import type { CVariable } from "@/lib/memory/memory-types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading editor…</div>
  ),
});

type MonacoEditorInstance = Parameters<OnMount>[0];
type MonacoApi = Parameters<OnMount>[1];

type CodeEditorProps = {
  code: string;
  variables: readonly CVariable[];
  issues: readonly ParseIssue[];
  selectedVariableId: string | null;
  focusToken: number;
  onCodeChange: (code: string) => void;
  onSelectLine: (lineNumber: number, column: number) => void;
};

export function CodeEditor({
  code,
  variables,
  issues,
  selectedVariableId,
  focusToken,
  onCodeChange,
  onSelectLine,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);
  const decorationsRef = useRef<{ clear: () => void } | null>(null);
  const selectLineRef = useRef(onSelectLine);
  const applyRef = useRef<() => void>(() => {});

  useEffect(() => {
    selectLineRef.current = onSelectLine;
  }, [onSelectLine]);

  useEffect(() => {
    applyRef.current = () => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;
      const model = editor.getModel();
      if (!model) return;

      monaco.editor.setModelMarkers(
        model,
        "c-variables",
        issues.map((issue) => ({
          startLineNumber: issue.lineNumber,
          startColumn: issue.column,
          endLineNumber: issue.lineNumber,
          endColumn: Math.max(issue.column + 1, issue.endColumn),
          message: issue.message,
          severity: issue.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        })),
      );

      decorationsRef.current?.clear();
      const tokenDecorations = variables.map((variable) => ({
        range: new monaco.Range(variable.lineNumber, variable.column, variable.lineNumber, variable.endColumn),
        options: { inlineClassName: `mem-var-token-${variable.colorId}` },
      }));
      const lineDecorations = variables
        .filter((variable) => variable.id === selectedVariableId)
        .map((variable) => ({
          range: new monaco.Range(variable.lineNumber, 1, variable.lineNumber, 1),
          options: { isWholeLine: true, className: `mem-var-line-${variable.colorId}` },
        }));
      decorationsRef.current = editor.createDecorationsCollection([...tokenDecorations, ...lineDecorations]);
    };
    applyRef.current();
  }, [issues, selectedVariableId, variables]);

  useEffect(() => {
    if (focusToken === 0) return;
    const editor = editorRef.current;
    const variable = variables.find((item) => item.id === selectedVariableId);
    if (!editor || !variable) return;
    editor.revealLineInCenter(variable.lineNumber);
    editor.setPosition({ lineNumber: variable.lineNumber, column: variable.column });
  }, [focusToken, selectedVariableId, variables]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onMouseDown((event) => {
      const position = event.target.position;
      if (!position) return;
      selectLineRef.current(position.lineNumber, position.column);
    });
    applyRef.current();
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <MonacoEditor
        height="100%"
        language="c"
        theme={theme === "dark" ? "vs-dark" : "light"}
        value={code}
        onChange={(value) => onCodeChange(value ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          lineNumbers: "on",
          matchBrackets: "always",
          autoIndent: "full",
          bracketPairColorization: { enabled: true },
          renderLineHighlight: "line",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          folding: false,
          glyphMargin: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          codeLens: false,
          stickyScroll: { enabled: false },
          tabSize: 4,
          insertSpaces: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          smoothScrolling: true,
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
}
