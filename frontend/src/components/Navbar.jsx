import { startTransition, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  CircleUser,
  FolderOpen,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCompare } from '../context/CompareContext.jsx';
import { RoleBadge, VerifiedBadge } from './Badges.jsx';
import Logo from './Logo.jsx';
import { Avatar } from './ui.jsx';

function usePendingCount(enabled) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const load = () =>
      api
        .get('/admin/moderation/counts')
        .then((d) => alive && setCount(d.total))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener('hv:moderation-changed', load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('hv:moderation-changed', load);
    };
  }, [enabled]);
  return count;
}

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

export default function Navbar() {
  const { user, logout, isAdmin, canContribute, needsVerification } = useAuth();
  const { items } = useCompare();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const pending = usePendingCount(isAdmin);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    startTransition(() => {
      logout();
      navigate('/');
    });
  };

  const compareBadge = items.length > 0 && (
    <span className="ml-1.5 rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">{items.length}</span>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="shrink-0" aria-label="HostelView home">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/hostels" className={navClass}>
            Explore
          </NavLink>
          <NavLink to="/colleges" className={navClass}>
            Colleges
          </NavLink>
          <NavLink to="/compare" className={navClass}>
            <span className="inline-flex items-center">
              Compare
              {compareBadge}
            </span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navClass}>
              <span className="inline-flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Admin
                {pending > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">{pending}</span>
                )}
              </span>
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NavLink
            to="/dev/mailbox"
            title="Dev Mailbox — simulated emails (OTP codes)"
            className={({ isActive }) =>
              `hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold sm:inline-flex ${isActive ? 'bg-amber-100 text-amber-900' : 'text-amber-800 hover:bg-amber-50'}`
            }
          >
            <Mail className="h-4 w-4" />
            <span className="hidden lg:inline">Dev Mailbox</span>
          </NavLink>

          {canContribute && (
            <Link to="/hostels/new" className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Plus className="h-4 w-4" />
              Add hostel
            </Link>
          )}

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar name={user.name} size="h-8 w-8 text-xs" />
                <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-64 animate-slide-up overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RoleBadge role={user.role} />
                      {user.role === 'student' && user.is_verified && <VerifiedBadge label="Verified" />}
                    </div>
                    {user.college_name && <p className="mt-1.5 truncate text-xs text-slate-500">{user.college_name}</p>}
                  </div>
                  <div className="py-1 text-sm">
                    <MenuLink to="/account" icon={CircleUser}>
                      My account
                    </MenuLink>
                    <MenuLink to="/account?tab=submissions" icon={FolderOpen}>
                      My submissions
                    </MenuLink>
                    {needsVerification && (
                      <MenuLink to="/verify" icon={ShieldAlert} className="text-amber-700">
                        Verify college email
                      </MenuLink>
                    )}
                    {user.role === 'visitor' && (
                      <MenuLink to="/verify" icon={ShieldAlert}>
                        Become a verified student
                      </MenuLink>
                    )}
                    {isAdmin && (
                      <MenuLink to="/admin" icon={LayoutDashboard}>
                        Admin dashboard
                      </MenuLink>
                    )}
                    <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-slate-700 hover:bg-slate-50">
                      <LogOut className="h-4 w-4 text-slate-400" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Link to="/login" state={{ from: location }} className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </div>
          )}

          <button className="btn btn-ghost btn-icon md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            <NavLink to="/hostels" className={navClass}>
              Explore hostels
            </NavLink>
            <NavLink to="/colleges" className={navClass}>
              Colleges
            </NavLink>
            <NavLink to="/compare" className={navClass}>
              <span className="inline-flex items-center">
                <GitCompareArrows className="mr-2 h-4 w-4" />
                Compare {compareBadge}
              </span>
            </NavLink>
            {canContribute && (
              <NavLink to="/hostels/new" className={navClass}>
                Add a hostel
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Admin dashboard {pending > 0 && `(${pending} pending)`}
              </NavLink>
            )}
            <NavLink to="/dev/mailbox" className={navClass}>
              Dev Mailbox (simulated emails)
            </NavLink>
            {!user && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="btn btn-secondary">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}

      {needsVerification && location.pathname !== '/verify' && (
        <div className="border-t border-amber-200 bg-amber-50">
          <div className="container-page flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-amber-900">
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Verify your college email to start adding hostels, photos and reviews.
            </span>
            <Link to="/verify" className="font-semibold underline underline-offset-2 hover:no-underline">
              Verify now →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ to, icon: Icon, children, className = '' }) {
  return (
    <Link to={to} role="menuitem" className={`flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 ${className}`}>
      <Icon className="h-4 w-4 text-slate-400" />
      {children}
    </Link>
  );
}
