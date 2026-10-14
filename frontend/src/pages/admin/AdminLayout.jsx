import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Building2, ClipboardCheck, GraduationCap, LayoutDashboard, Users } from 'lucide-react';
import { api } from '../../api/client.js';

const LINKS = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/moderation', icon: ClipboardCheck, label: 'Moderation', badge: true },
  { to: '/admin/hostels', icon: Building2, label: 'Hostels' },
  { to: '/admin/users', icon: Users, label: 'Users & roles' },
  { to: '/admin/colleges', icon: GraduationCap, label: 'Colleges' },
];

export default function AdminLayout() {
  const [pending, setPending] = useState(null);

  useEffect(() => {
    const load = () =>
      api
        .get('/admin/moderation/counts')
        .then(setPending)
        .catch(() => {});
    load();
    window.addEventListener('hv:moderation-changed', load);
    return () => window.removeEventListener('hv:moderation-changed', load);
  }, []);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-violet-700">Admin</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Moderation dashboard</h1>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start">
          {LINKS.map(({ to, end, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
              {badge && pending?.total > 0 && (
                <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">{pending.total}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet context={{ pending }} />
        </div>
      </div>
    </div>
  );
}
