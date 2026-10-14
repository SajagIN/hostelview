import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import { LogoMark } from '../components/Logo.jsx';
import { Field } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../lib/useApi.js';

const DEMO = [
  { label: 'Admin', email: 'admin@hostelview.io', password: 'Admin@123', note: 'moderates content' },
  { label: 'Verified student', email: 'priya.demo@vitstudent.ac.in', password: 'Student@123', note: 'VIT — can contribute' },
  { label: 'Unverified student', email: 'vikram.demo@srmist.edu.in', password: 'Student@123', note: 'SRM — try the OTP flow' },
  { label: 'Visitor', email: 'sneha.patel@example.com', password: 'Visitor@123', note: 'read-only' },
];

export default function Login() {
  useDocumentTitle('Log in');
  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitted = useRef(false);

  const from = location.state?.from?.pathname && location.state.from.pathname !== '/login' ? location.state.from.pathname : null;

  if (user && !submitted.current) return <Navigate to={from || '/'} replace />;

  const doLogin = async (email, password) => {
    setBusy(true);
    setError('');
    submitted.current = true;
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      const fallback = u.role === 'admin' ? '/admin' : u.role === 'student' && !u.is_verified ? '/verify' : '/';
      navigate(from || fallback, { replace: true });
    } catch (err) {
      submitted.current = false;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page grid max-w-5xl items-start gap-8 py-12 lg:grid-cols-[1fr_22rem]">
      <div className="card mx-auto w-full max-w-md p-8">
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Log in to HostelView</h1>
        <p className="mt-1 text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="link">
            Create an account
          </Link>
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            doLogin(form.email, form.password);
          }}
        >
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <div className="relative">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                className="input pr-10"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            <LogIn className="h-4 w-4" /> {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>

      <aside className="card mx-auto w-full max-w-md p-6 lg:mt-0">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-amber-500" /> Demo accounts
        </h2>
        <p className="mt-1 text-sm text-slate-500">From the sample data — one click to log in.</p>
        <ul className="mt-4 space-y-2">
          {DEMO.map((d) => (
            <li key={d.email}>
              <button
                onClick={() => doLogin(d.email, d.password)}
                disabled={busy}
                className="w-full rounded-xl px-3 py-2.5 text-left ring-1 ring-slate-200 transition hover:bg-brand-50 hover:ring-brand-300"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{d.label}</span>
                  <span className="text-[11px] text-slate-400">{d.note}</span>
                </span>
                <span className="mt-0.5 block truncate font-mono text-xs text-slate-500">
                  {d.email} · {d.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
