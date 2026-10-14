import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import CollegeFormModal from '../../components/modals/CollegeFormModal.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useMeta } from '../../context/MetaContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi, useDocumentTitle } from '../../lib/useApi.js';

export default function AdminColleges() {
  useDocumentTitle('Colleges · Admin');
  const toast = useToast();
  const confirm = useConfirm();
  const { reload: reloadMeta } = useMeta();
  const { data, loading, error, reload } = useApi(() => api.get('/colleges'), []);
  const [modal, setModal] = useState({ open: false, college: null });

  const remove = async (c) => {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      message: 'Students linked to this college lose their verification. Colleges that still have hostels cannot be deleted.',
      confirmText: 'Delete college',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/colleges/${c.college_id}`);
      toast.success('College deleted.');
      reload();
      reloadMeta();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{data?.colleges.length ?? 0} colleges</p>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, college: null })}>
          <Plus className="h-4 w-4" /> Add college
        </button>
      </div>
      <div className="mt-4">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <PageLoader />
        ) : !data.colleges.length ? (
          <EmptyState title="No colleges yet" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Approved hostels</th>
                  <th className="px-4 py-3">Verified students</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.colleges.map((c) => (
                  <tr key={c.college_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                          {c.website.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.city}, {c.state}
                    </td>
                    <td className="px-4 py-3">{c.hostel_count}</td>
                    <td className="px-4 py-3">{c.verified_students}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, college: c })} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="btn btn-ghost btn-sm hover:text-rose-600" onClick={() => remove(c)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CollegeFormModal
        open={modal.open}
        college={modal.college}
        onClose={() => setModal({ open: false, college: null })}
        onSaved={() => {
          reload();
          reloadMeta();
        }}
      />
    </div>
  );
}
