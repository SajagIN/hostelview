import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Inbox, Mail, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { EmptyState, ErrorState } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

export default function DevMailbox() {
  useDocumentTitle('Dev Mailbox');
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, reload, loading } = useApi(() => api.get('/dev/mailbox', { limit: 100 }), []);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const t = setInterval(reload, 4000);
    return () => clearInterval(t);
  }, [reload]);

  const messages = data?.messages ?? [];
  const selected = messages.find((m) => m.id === selectedId) ?? messages[0];

  const clear = async () => {
    if (!(await confirm({ title: 'Clear the dev mailbox?', message: 'All simulated emails will be removed.', confirmText: 'Clear', danger: true }))) return;
    await api.del('/dev/mailbox');
    toast.success('Mailbox cleared.');
    reload();
  };

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900">
            <Mail className="h-7 w-7 text-amber-600" /> Dev Mailbox
          </h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            HostelView runs fully offline, so email is <b>simulated</b>. Every OTP email the backend “sends” lands here and in the
            backend console. Nothing leaves your computer.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="btn btn-secondary btn-sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {messages.length > 0 && (
            <button onClick={clear} className="btn btn-danger-soft btn-sm">
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !messages.length ? (
          <EmptyState
            icon={Inbox}
            title="No emails yet"
            action={
              <Link to={user ? '/verify' : '/register?type=student'} className="btn btn-primary">
                {user ? 'Send a verification code' : 'Register as a student'}
              </Link>
            }
          >
            Register as a student or request a verification code, and the email will appear here within a few seconds.
          </EmptyState>
        ) : (
          <div className="card grid overflow-hidden md:grid-cols-[22rem_1fr]">
            <ul className="max-h-[36rem] divide-y divide-slate-100 overflow-y-auto border-b border-slate-200 md:border-r md:border-b-0">
              {messages.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full px-4 py-3 text-left transition ${selected?.id === m.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{m.to}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(m.sent_at)}</span>
                    </div>
                    <p className="truncate text-sm text-slate-600">{m.subject}</p>
                  </button>
                </li>
              ))}
            </ul>
            {selected && (
              <article className="p-6">
                <h2 className="text-lg font-semibold text-slate-900">{selected.subject}</h2>
                <dl className="mt-3 grid grid-cols-[4rem_1fr] gap-y-1 text-sm">
                  <dt className="text-slate-400">From</dt>
                  <dd className="text-slate-700">{selected.from}</dd>
                  <dt className="text-slate-400">To</dt>
                  <dd className="text-slate-700">{selected.to}</dd>
                  <dt className="text-slate-400">Date</dt>
                  <dd className="text-slate-700">{formatDateTime(selected.sent_at)}</dd>
                </dl>
                {selected.meta?.code && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">One-time code</p>
                      <p className="font-mono text-3xl font-bold tracking-[0.35em] text-brand-900">{selected.meta.code}</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(selected.meta.code);
                          toast.success('Code copied.');
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Copy className="h-4 w-4" /> Copy
                      </button>
                      {user?.user_id === selected.meta.user_id && (
                        <Link to="/verify" className="btn btn-primary btn-sm">
                          Enter code
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                <pre className="mt-5 rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6 whitespace-pre-wrap text-slate-700 ring-1 ring-slate-200">
                  {selected.text}
                </pre>
              </article>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
