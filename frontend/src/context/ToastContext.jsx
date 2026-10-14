import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600' },
  error: { icon: AlertCircle, cls: 'text-rose-600' },
  info: { icon: Info, cls: 'text-sky-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-3), { id, type, message, title: opts.title }]);
      setTimeout(() => remove(id), opts.duration ?? (type === 'error' ? 6000 : 4500));
    },
    [remove],
  );

  const toast = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', typeof m === 'string' ? m : m?.message || 'Something went wrong.', o),
      info: (m, o) => push('info', m, o),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:top-4 sm:right-4 sm:left-auto sm:items-end">
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl bg-white p-3.5 shadow-lg ring-1 ring-slate-200"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} />
              <div className="min-w-0 flex-1 text-sm">
                {t.title && <p className="font-semibold text-slate-900">{t.title}</p>}
                <p className="text-slate-600">{t.message}</p>
              </div>
              <button onClick={() => remove(t.id)} className="rounded-md p-0.5 text-slate-400 hover:text-slate-600" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
