import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CircleCheck, MailCheck, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api, fieldErrors, tokenStore } from '../api/client.js';
import DevOtpPanel from '../components/DevOtpPanel.jsx';
import OtpInput from '../components/OtpInput.jsx';
import { Field } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

export default function Verify() {
  useDocumentTitle('Verify college email');
  const { user, verification, setVerification, applySession, refresh } = useAuth();
  const { meta } = useMeta();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const colleges = useApi(() => api.get('/colleges'), []);

  const pending = verification?.pending ? verification : null;
  const initialOtp = location.state?.otp;
  const [mode, setMode] = useState(() => (pending || initialOtp || user?.college_email ? 'code' : 'request'));
  const [targetEmail, setTargetEmail] = useState(pending?.college_email || initialOtp?.sent_to || user?.college_email || '');
  const [form, setForm] = useState({ college_id: String(user?.college_id ?? ''), college_email: user?.college_email ?? '' });
  const [errors, setErrors] = useState({});
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(Boolean(pending || initialOtp));
  const [cooldown, setCooldown] = useState(pending?.resend_in ?? initialOtp?.resend_in ?? 0);
  const [mailKey, setMailKey] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (pending && !codeSent) {
      setCodeSent(true);
      setTargetEmail(pending.college_email);
      setCooldown(pending.resend_in);
      setMode('code');
    }
  }, [pending, codeSent]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const alreadyVerified = user?.role === 'student' && user?.is_verified && !done;

  const sendCode = async (body = {}) => {
    setBusy(true);
    setErrors({});
    try {
      const data = await api.post('/auth/verification/send', body);
      setVerification(data.verification);
      setTargetEmail(data.otp.sent_to);
      setCodeSent(true);
      setCooldown(data.otp.resend_in);
      setMode('code');
      setCode('');
      setMailKey((k) => k + 1);
      toast.success(data.message);
    } catch (err) {
      setErrors(fieldErrors(err));
      if (err.details?.retry_after) setCooldown(err.details.retry_after);
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    try {
      const data = await api.post('/auth/verification/confirm', { code: value });
      tokenStore.set(data.token);
      applySession({ user: data.user, verification: { pending: false } });
      setDone(true);
      toast.success(data.message, { title: 'Verified!' });
    } catch (err) {
      setErrors({ code: err.message });
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (user?.role === 'admin') {
    return (
      <Shell>
        <ShieldCheck className="mx-auto h-10 w-10 text-violet-600" />
        <h1 className="mt-4 text-center text-2xl font-bold text-slate-900">Admins don&apos;t need verification</h1>
        <p className="mt-2 text-center text-slate-500">You can already moderate and add content.</p>
        <Link to="/admin" className="btn btn-primary mt-6 w-full">
          Go to the admin dashboard
        </Link>
      </Shell>
    );
  }

  if (done || alreadyVerified) {
    const from = location.state?.from?.pathname;
    return (
      <Shell>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CircleCheck className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-slate-900">You&apos;re a verified student</h1>
        <p className="mt-2 text-center text-slate-500">
          {user?.college_email} · {user?.college_name}
          <br />
          You can now add hostels, rooms, photos and reviews for your college.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button onClick={() => navigate(from && from !== '/verify' ? from : '/hostels/new')} className="btn btn-primary">
            <Plus className="h-4 w-4" /> {from && from !== '/verify' ? 'Continue' : 'Add a hostel'}
          </button>
          <Link to={`/hostels?college_id=${user?.college_id ?? ''}`} className="btn btn-secondary">
            <Search className="h-4 w-4" /> My college&apos;s hostels
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <div className="container-page grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-[1fr_20rem]">
      <div className="card p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <MailCheck className="h-6 w-6" />
        </div>

        {mode === 'request' ? (
          <>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              {user?.role === 'visitor' ? 'Become a verified student' : 'Verify your college email'}
            </h1>
            <p className="mt-1 text-slate-500">
              Only current students can contribute. Confirm your official college email with a one-time code.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                sendCode({ college_id: Number(form.college_id) || null, college_email: form.college_email });
              }}
            >
              <Field label="Your college" required error={errors.college_id}>
                <select className="input" value={form.college_id} onChange={(e) => setForm((f) => ({ ...f, college_id: e.target.value }))} required>
                  <option value="">Select your college…</option>
                  {colleges.data?.colleges.map((c) => (
                    <option key={c.college_id} value={c.college_id}>
                      {c.name} — {c.city}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Official college email" required error={errors.college_email}>
                <input
                  type="email"
                  className="input"
                  value={form.college_email}
                  onChange={(e) => setForm((f) => ({ ...f, college_email: e.target.value }))}
                  placeholder="yourname@college.edu"
                  required
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" disabled={busy || cooldown > 0}>
                  {busy ? 'Sending…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send verification code'}
                </button>
                {codeSent && (
                  <button type="button" className="btn btn-ghost" onClick={() => setMode('code')}>
                    I already have a code
                  </button>
                )}
              </div>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Enter your verification code</h1>
            <p className="mt-1 text-slate-500">
              {codeSent ? (
                <>
                  We sent a 6-digit code to <b className="text-slate-800">{targetEmail}</b>. It expires in {meta?.otp?.ttl_minutes ?? 10} minutes.
                </>
              ) : (
                <>
                  Send a one-time code to <b className="text-slate-800">{targetEmail}</b> to finish verifying.
                </>
              )}
            </p>

            {!codeSent ? (
              <button className="btn btn-primary mt-6" onClick={() => sendCode({})} disabled={busy}>
                {busy ? 'Sending…' : 'Send verification code'}
              </button>
            ) : (
              <div className="mt-8">
                <OtpInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setErrors({});
                    if (v.length === 6) confirm(v);
                  }}
                  disabled={busy}
                  autoFocus
                  invalid={Boolean(errors.code)}
                />
                {errors.code && <p className="mt-3 text-center text-sm font-medium text-rose-600">{errors.code}</p>}
                <button className="btn btn-primary btn-lg mt-6 w-full" onClick={() => confirm()} disabled={busy || code.length !== 6}>
                  {busy ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
              <button
                className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800 disabled:text-slate-400"
                onClick={() => sendCode({})}
                disabled={busy || cooldown > 0}
              >
                <RefreshCw className="h-4 w-4" />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : codeSent ? 'Resend code' : 'Send code'}
              </button>
              <button className="font-medium text-slate-500 hover:text-slate-800" onClick={() => setMode('request')}>
                Use a different college email
              </button>
            </div>
          </>
        )}
      </div>

      <DevOtpPanel
        email={mode === 'code' ? targetEmail : form.college_email}
        refreshKey={mailKey}
        onUseCode={
          mode === 'code' && codeSent
            ? (c) => {
                setCode(c);
                confirm(c);
              }
            : undefined
        }
      />
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="container-page max-w-lg py-16">
      <div className="card p-8">{children}</div>
    </div>
  );
}
