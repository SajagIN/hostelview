import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Inbox, RefreshCw } from 'lucide-react';
import { api } from '../api/client.js';
import { timeAgo } from '../lib/format.js';

export default function DevOtpPanel({ email, refreshKey, onUseCode }) {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const data = await api.get('/dev/mailbox', { to: email, limit: 1 });
      setMessage(data.messages[0] ?? null);
    } catch {
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [email, refreshKey]);

  const code = message?.meta?.code;

  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Inbox className="h-4 w-4" />
          Simulated inbox
        </p>
        <button onClick={load} className="rounded-md p-1 text-amber-700 hover:bg-amber-100" title="Refresh" aria-label="Refresh inbox">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="mt-1 text-xs text-amber-800/80">
        Email delivery is faked for local use — nothing leaves your computer. The message below is exactly what the backend &ldquo;sent&rdquo;.
      </p>

      {message ? (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-amber-200">
          <p className="truncate text-xs text-slate-500">
            To <span className="font-medium text-slate-700">{message.to}</span> · {timeAgo(message.sent_at)}
          </p>
          <p className="mt-0.5 truncate font-medium text-slate-800">{message.subject}</p>
          {code && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-2">
              <span className="font-mono text-2xl font-bold tracking-[0.3em] text-brand-800">{code}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => navigator.clipboard?.writeText(code)}
                  className="rounded-md p-1.5 text-brand-700 hover:bg-brand-100"
                  title="Copy code"
                  aria-label="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {onUseCode && (
                  <button onClick={() => onUseCode(code)} className="btn btn-primary btn-sm">
                    Use code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-900/70">{loading ? 'Checking…' : 'No email yet — send a code first.'}</p>
      )}
      <Link to="/dev/mailbox" className="mt-3 inline-block text-xs font-semibold text-amber-800 underline underline-offset-2">
        Open the full Dev Mailbox →
      </Link>
    </div>
  );
}
