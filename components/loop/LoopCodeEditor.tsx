"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { OnMount } from "@monaco-editor/react";

import { useTheme } from "@/components/theme/ThemeProvider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading editor…</div>
  ),
});

type MonacoEditorInstance = Parameters<OnMount>[0];
type MonacoApi = Parameters<OnMount>[1];

type LoopCodeEditorProps = {
  code: string;
  activeLine: number | null;
  error: { message: string; line: number | null } | null;
  onCodeChange: (code: string) => void;
};

export function LoopCodeEditor({ code, activeLine, error, onCodeChange }: LoopCodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);
  const decorationsRef = useRef<{ clear: () => void } | null>(null);
  const applyRef = useRef<() => void>(() => {});

  useEffect(() => {
    applyRef.current = () => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor?.getModel();
      if (!editor || !monaco || !model) return;

      monaco.editor.setModelMarkers(
        model,
        "for-loop",
        error?.line
          ? [
              {
                startLineNumber: error.line,
                startColumn: 1,
                endLineNumber: error.line,
                endColumn: model.getLineMaxColumn(error.line),
                message: error.message,
                severity: monaco.MarkerSeverity.Warning,
              },
            ]
          : [],
      );

      decorationsRef.current?.clear();
      if (activeLine !== null && activeLine <= model.getLineCount()) {
        decorationsRef.current = editor.createDecorationsCollection([
          {
            range: new monaco.Range(activeLine, 1, activeLine, 1),
            options: { isWholeLine: true, className: "loop-active-line", linesDecorationsClassName: "loop-active-gutter" },
          },
        ]);
        editor.revealLineInCenterIfOutsideViewport(activeLine);
      }
    };
    applyRef.current();
  }, [activeLine, error]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
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
          fontSize: 14,
          lineHeight: 26,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 10,
          matchBrackets: "always",
          autoIndent: "full",
          renderLineHighlight: "none",
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
          padding: { top: 10, bottom: 10 },
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, alwaysConsumeMouseWheel: false },
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
}
