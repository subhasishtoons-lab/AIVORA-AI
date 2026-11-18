import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useDirectory();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.tone === 'success' && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            )}
            {toast.tone === 'info' && (
              <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            )}
            {toast.tone === 'error' && (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            )}
            <span className="text-slate-800 dark:text-slate-100">{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
