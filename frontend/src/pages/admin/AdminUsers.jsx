import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { Avatar, EmptyState, ErrorState, PageLoader, Toggle } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate, plural } from '../../lib/format.js';
import { useApi, useDebouncedValue, useDocumentTitle } from '../../lib/useApi.js';

export default function AdminUsers() {
  useDocumentTitle('Users · Admin');
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const debounced = useDebouncedValue(q, 300);
  const users = useApi(() => api.get('/admin/users', { q: debounced, role }), [debounced, role]);
  const colleges = useApi(() => api.get('/colleges'), []);

  const update = async (u, patch, message) => {
    try {
      await api.patch(`/admin/users/${u.user_id}`, patch);
      toast.success(message ?? 'User updated.');
      users.reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const remove = async (u) => {
    const ok = await confirm({
      title: `Delete ${u.name}?`,
      message: `Their ${plural(u.photo_count, 'photo')} and ${plural(u.review_count, 'review')} are deleted. Hostels they listed (${u.hostel_count}) are kept and re-assigned to you.`,
      confirmText: 'Delete user',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api.del(`/admin/users/${u.user_id}`);
      toast.success(res.message);
      users.reload();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search name, email, college…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="unverified">Unverified students</option>
          <option value="visitor">Visitors</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="mt-4">
        {users.error ? (
          <ErrorState error={users.error} onRetry={users.reload} />
        ) : users.loading && !users.data ? (
          <PageLoader />
        ) : !users.data.users.length ? (
          <EmptyState title="No users found" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Contributions</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.data.users.map((u) => {
                  const self = u.user_id === me.user_id;
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="h-8 w-8 text-xs" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {u.name} {self && <span className="text-xs font-normal text-slate-400">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="rounded-lg border-0 bg-white py-1 pr-7 pl-2 text-xs font-semibold ring-1 ring-slate-300 ring-inset"
                          value={u.role}
                          disabled={self}
                          onChange={(e) => update(u, { role: e.target.value }, `${u.name} is now ${e.target.value === 'admin' ? 'an admin' : `a ${e.target.value}`}.`)}
                          aria-label="Role"
                        >
                          <option value="visitor">Visitor</option>
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle
                          checked={u.is_verified}
                          label="Verified"
                          disabled={u.role !== 'student'}
                          onChange={(v) => update(u, { is_verified: v }, v ? `${u.name} marked as verified.` : `${u.name}'s verification removed.`)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="max-w-[12rem] rounded-lg border-0 bg-white py-1 pr-7 pl-2 text-xs ring-1 ring-slate-300 ring-inset"
                          value={u.college_id ?? ''}
                          onChange={(e) => update(u, { college_id: e.target.value ? Number(e.target.value) : null })}
                          aria-label="College"
                        >
                          <option value="">— none —</option>
                          {colleges.data?.colleges.map((c) => (
                            <option key={c.college_id} value={c.college_id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {u.college_email && <p className="mt-1 truncate text-[11px] text-slate-400">{u.college_email}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {plural(u.hostel_count, 'hostel')} · {plural(u.photo_count, 'photo')} · {plural(u.review_count, 'review')}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {!self && (
                          <button onClick={() => remove(u)} className="btn btn-ghost btn-sm hover:text-rose-600" title="Delete user">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
