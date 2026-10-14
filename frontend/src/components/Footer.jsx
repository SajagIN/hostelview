import { Link } from 'react-router-dom';
import { Database, Server, ShieldCheck } from 'lucide-react';
import Logo from './Logo.jsx';
import { useMeta } from '../context/MetaContext.jsx';

export default function Footer() {
  const { meta } = useMeta();
  const db = meta?.database;
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
            Verified photos, room details and honest reviews from students who actually live there — every submission is checked
            by a moderator before it goes public.
          </p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
            Demo data: colleges and hostel names are real; fees are approximate (published 2025-26 figures), reviews are written for this
            demo. Real photos are from Wikimedia Commons (credited in captions); others are AI illustrations.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> React SPA
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
              <Server className="h-3.5 w-3.5" /> Node.js + Express
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
              <Database className="h-3.5 w-3.5" /> MySQL {db?.version || '8.0'}
              <span className="text-slate-400">· installed by npm</span>
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link className="hover:text-slate-900" to="/hostels">All hostels</Link></li>
            <li><Link className="hover:text-slate-900" to="/hostels?sort=price_asc">Most affordable</Link></li>
            <li><Link className="hover:text-slate-900" to="/hostels?ac=ac">AC rooms</Link></li>
            <li><Link className="hover:text-slate-900" to="/colleges">Compare colleges</Link></li>
            <li><Link className="hover:text-slate-900" to="/compare">Compare hostels</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Contribute</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link className="hover:text-slate-900" to="/register">Sign up as a student</Link></li>
            <li><Link className="hover:text-slate-900" to="/verify">Verify college email</Link></li>
            <li><Link className="hover:text-slate-900" to="/hostels/new">Add a hostel</Link></li>
            <li><Link className="hover:text-slate-900" to="/dev/mailbox">Dev Mailbox</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="container-page flex flex-col gap-1 py-5 text-xs text-slate-400 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} HostelView — by hostellers, for future hostellers.</p>
          <p>Runs entirely on your machine · emails are simulated locally</p>
        </div>
      </div>
    </footer>
  );
}
