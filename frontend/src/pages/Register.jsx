import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Search, ShieldCheck } from 'lucide-react';
import { api, fieldErrors } from '../api/client.js';
import { LogoMark } from '../components/Logo.jsx';
import { Field } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

const TYPES = [
  {
    key: 'visitor',
    icon: Search,
    title: "I'm looking for a hostel",
    text: 'Prospective student or parent — browse, compare and read reviews.',
  },
  {
    key: 'student',
    icon: GraduationCap,
    title: 'I live in a hostel',
    text: 'Current student — verify your college email to add photos, rooms and reviews.',
  },
];

export default function Register() {
  useDocumentTitle('Create account');
  const { register, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const colleges = useApi(() => api.get('/colleges'), []);
  const [form, setForm] = useState({
    account_type: params.get('type') === 'student' ? 'student' : 'visitor',
    name: '',
    email: '',
    password: '',
    confirm: '',
    college_id: '',
    college_email: '',
  });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);

  if (user && !submitted.current) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const student = form.account_type === 'student';

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    setBusy(true);
    setErrors({});
    submitted.current = true;
    try {
      const payload = {
        account_type: form.account_type,
        name: form.name,
        email: form.email,
        password: form.password,
        ...(student ? { college_id: Number(form.college_id) || null, college_email: form.college_email } : {}),
      };
      const data = await register(payload);
      if (data.otp) {
        toast.success(`We sent a 6-digit code to ${data.otp.sent_to}.`, { title: 'Account created' });
        navigate('/verify', { replace: true, state: { otp: data.otp } });
      } else {
        toast.success(`Welcome to HostelView, ${data.user.name.split(' ')[0]}!`);
        navigate('/hostels', { replace: true });
      }
    } catch (err) {
      submitted.current = false;
      setErrors(fieldErrors(err));
      if (!Object.keys(fieldErrors(err)).length) setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-6 sm:p-8">
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Create your HostelView account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Already have one?{' '}
          <Link to="/login" className="link">
            Log in
          </Link>
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map(({ key, icon: Icon, title, text }) => (
              <label key={key} className="cursor-pointer">
                <input type="radio" name="account_type" value={key} checked={form.account_type === key} onChange={set('account_type')} className="peer sr-only" />
                <div className="h-full rounded-2xl p-4 ring-1 ring-slate-300 transition peer-checked:bg-brand-50 peer-checked:ring-2 peer-checked:ring-brand-600 hover:bg-slate-50">
                  <Icon className="h-5 w-5 text-brand-700" />
                  <p className="mt-2 font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name} className="sm:col-span-2">
              <input className="input" value={form.name} onChange={set('name')} autoComplete="name" required maxLength={100} />
            </Field>
            <Field label="Email (for logging in)" required error={errors.email} className="sm:col-span-2">
              <input type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" required />
            </Field>
            <Field label="Password" required error={errors.password} hint="At least 8 characters">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="input pr-10"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password" required error={errors.confirm}>
              <input type={show ? 'text' : 'password'} className="input" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
            </Field>
          </div>

          {student && (
            <div className="space-y-4 rounded-2xl bg-brand-50/60 p-4 ring-1 ring-brand-200">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                <ShieldCheck className="h-4 w-4" /> College verification
              </p>
              <Field label="Your college" required error={errors.college_id}>
                <select className="input" value={form.college_id} onChange={set('college_id')} required>
                  <option value="">Select your college…</option>
                  {colleges.data?.colleges.map((c) => (
                    <option key={c.college_id} value={c.college_id}>
                      {c.name} — {c.city}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Official college email"
                required
                error={errors.college_email}
                hint="We'll email a 6-digit code here. (Locally the email is simulated — you'll see the code on the next screen.)"
              >
                <input type="email" className="input" value={form.college_email} onChange={set('college_email')} placeholder="yourname@college.edu" required />
              </Field>
            </div>
          )}

          {errors.form && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{errors.form}</p>}

          <button className="btn btn-primary btn-lg w-full" disabled={busy}>
            {busy ? 'Creating account…' : student ? 'Create account & send code' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
