import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardCheck,
  GraduationCap,
  MapPin,
  MessageSquareText,
  Scale,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { api } from '../api/client.js';
import HostelCard from '../components/HostelCard.jsx';
import HostelCover from '../components/HostelCover.jsx';
import { CardSkeleton } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

export default function Home() {
  useDocumentTitle('');
  const navigate = useNavigate();
  const { meta } = useMeta();
  const { user, canContribute } = useAuth();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  const stats = useApi(() => api.get('/stats'), []);
  const top = useApi(() => api.get('/hostels', { sort: 'rating', limit: 4 }), []);
  const colleges = useApi(() => api.get('/colleges'), []);

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (city) params.set('city', city);
    navigate(`/hostels${params.toString() ? `?${params}` : ''}`);
  };

  const covers = (top.data?.hostels ?? []).filter((h) => h.cover_url).slice(0, 3);
  const featured = top.data?.hostels?.[0];

  return (
    <>
      <section className="relative overflow-hidden bg-linear-to-b from-brand-50 via-white to-slate-50">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-32 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-800 shadow-sm ring-1 ring-brand-200">
              <BadgeCheck className="h-4 w-4 text-brand-600" />
              Every review comes from a verified current student
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              See the hostel <span className="text-brand-700">before</span> you move in.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Real room photos, prices, amenities and honest reviews from students who live there — checked by moderators, so you
              can compare hostels with confidence.
            </p>

            <form onSubmit={search} className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200 sm:flex-row">
              <label className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Hostel or college name…"
                  className="w-full border-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
                  aria-label="Search hostels"
                />
              </label>
              <label className="flex items-center gap-2 border-slate-200 px-3 sm:border-l">
                <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border-0 bg-transparent py-2.5 text-sm text-slate-700 outline-none sm:w-36"
                  aria-label="City"
                >
                  <option value="">Any city</option>
                  {meta?.cities?.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary">Search</button>
            </form>

            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                ['Hostels', stats.data?.hostels],
                ['Colleges', stats.data?.colleges],
                ['Reviews', stats.data?.reviews],
                ['Verified students', stats.data?.verified_students],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="mt-1 text-2xl font-bold text-slate-900">{value ?? '–'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden h-[30rem] lg:block">
            <HostelCover
              src={covers[0]?.cover_url}
              alt={covers[0]?.name}
              type={covers[0]?.type}
              label=""
              className="absolute top-0 right-0 h-80 w-[78%] rounded-3xl shadow-2xl ring-1 ring-black/5"
            />
            <HostelCover
              src={covers[1]?.cover_url}
              alt={covers[1]?.name}
              type={covers[1]?.type ?? 'girls'}
              label=""
              className="absolute bottom-0 left-0 h-56 w-[55%] rounded-3xl shadow-2xl ring-4 ring-white"
            />
            <HostelCover
              src={covers[2]?.cover_url}
              alt={covers[2]?.name}
              type={covers[2]?.type ?? 'coed'}
              label=""
              className="absolute right-6 bottom-6 h-40 w-[36%] rounded-3xl shadow-2xl ring-4 ring-white"
            />
            {featured && (
              <Link
                to={`/hostels/${featured.hostel_id}`}
                className="absolute top-64 left-4 flex w-64 animate-slide-up items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-slate-200 backdrop-blur hover:ring-brand-300"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <Star className="h-6 w-6 text-amber-400" fill="currentColor" strokeWidth={0} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{featured.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {featured.avg_rating.toFixed(1)} ★ · {featured.review_count} verified reviews
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Top-rated hostels</h2>
            <p className="mt-1 text-slate-500">Ranked by the average of approved student reviews.</p>
          </div>
          <Link to="/hostels" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {top.loading && !top.data
            ? Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)
            : top.data?.hostels.map((h) => <HostelCard key={h.hostel_id} hostel={h} />)}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="container-page py-14">
          <h2 className="section-title text-center">How HostelView keeps information trustworthy</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-slate-500">
            Anyone can browse. Only verified current students can contribute, and nothing goes public without a moderator.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: '1 · Students verify',
                text: 'Students confirm their official college email with a 6-digit one-time code before they can post anything.',
              },
              {
                icon: Camera,
                title: '2 · They share the real picture',
                text: 'Room types, prices, free beds, photos of rooms, washrooms and mess — plus 1–5 star reviews.',
              },
              {
                icon: ClipboardCheck,
                title: '3 · Moderators approve',
                text: 'Every hostel, photo and review starts as pending. Only approved content is shown and counted in ratings.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Browse by college</h2>
            <p className="mt-1 text-slate-500">Hostels are always linked to the college they serve.</p>
          </div>
          <Link to="/colleges" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex">
            All colleges <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.data?.colleges.slice(0, 6).map((c) => (
            <Link
              key={c.college_id}
              to={`/hostels?college_id=${c.college_id}`}
              className="card group flex items-center gap-4 p-4 transition hover:shadow-md hover:ring-brand-200"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 group-hover:text-brand-700">{c.name}</p>
                <p className="text-sm text-slate-500">
                  {c.city}, {c.state} · {c.hostel_count} hostel{c.hostel_count === 1 ? '' : 's'}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -top-20 -right-10 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold sm:text-3xl">Living in a hostel right now?</h2>
              <p className="mt-2 text-brand-100">
                Help next year&apos;s students make a better choice. Verify your college email and share photos, room details and
                an honest review.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canContribute ? (
                <Link to="/hostels/new" className="btn btn-lg bg-white text-brand-900 hover:bg-brand-50">
                  <MessageSquareText className="h-5 w-5" /> Add your hostel
                </Link>
              ) : user ? (
                <Link to="/verify" className="btn btn-lg bg-white text-brand-900 hover:bg-brand-50">
                  <ShieldCheck className="h-5 w-5" /> Verify my college email
                </Link>
              ) : (
                <Link to="/register?type=student" className="btn btn-lg bg-white text-brand-900 hover:bg-brand-50">
                  <ShieldCheck className="h-5 w-5" /> Join as a student
                </Link>
              )}
              <Link to="/compare" className="btn btn-lg bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
                <Scale className="h-5 w-5" /> Compare hostels
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
