export function OutputConsole({ output }: { output: string }) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Program output"
      className="minimal-scroll max-h-40 min-h-14 overflow-y-auto rounded-lg bg-[#111827] px-4 py-3.5 font-mono text-sm leading-6 break-all whitespace-pre-wrap text-slate-100 shadow-inner"
    >
      {output}
      <span className="loop-caret ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-slate-300" aria-hidden />
    </div>
  );
}
