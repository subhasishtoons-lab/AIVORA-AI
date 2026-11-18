export function ToolCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
        </div>
        <div className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3.5 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-3.5 w-4/5 rounded bg-slate-100 dark:bg-slate-800/70" />
      </div>
      <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="h-8 flex-1 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-28 rounded-lg bg-slate-100 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}
