import { useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleX, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMeta } from '../../context/MetaContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { floorLabel, roomTypeLabel } from '../../lib/format.js';
import Modal from '../Modal.jsx';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function PhotoUploadModal({ open, onClose, hostel, defaultRoomId = '', onUploaded }) {
  const { meta } = useMeta();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const maxMb = meta?.max_upload_mb ?? 5;

  useEffect(() => {
    if (!open) {
      setItems((list) => {
        list.forEach((it) => URL.revokeObjectURL(it.preview));
        return [];
      });
    }
  }, [open]);

  const addFiles = (files) => {
    const next = [];
    for (const file of files) {
      if (!ACCEPT.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG, WEBP or GIF images.`);
        continue;
      }
      if (file.size > maxMb * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${maxMb} MB.`);
        continue;
      }
      next.push({
        id: Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        room_id: defaultRoomId ? String(defaultRoomId) : '',
        state: 'ready',
        error: null,
      });
    }
    setItems((list) => [...list, ...next].slice(0, 10));
  };

  const update = (id, patch) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) =>
    setItems((list) => {
      const it = list.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return list.filter((x) => x.id !== id);
    });

  const upload = async () => {
    setUploading(true);
    let ok = 0;
    for (const it of items) {
      if (it.state === 'done') continue;
      update(it.id, { state: 'uploading', error: null });
      const form = new FormData();
      form.append('photo', it.file);
      if (it.caption.trim()) form.append('caption', it.caption.trim());
      if (it.room_id) form.append('room_id', it.room_id);
      try {
        await api.upload(`/hostels/${hostel.hostel_id}/photos`, form);
        update(it.id, { state: 'done' });
        ok++;
      } catch (err) {
        update(it.id, { state: 'error', error: err.message });
      }
    }
    setUploading(false);
    if (ok) {
      toast.success(
        isAdmin ? `${ok} photo${ok > 1 ? 's' : ''} published.` : `${ok} photo${ok > 1 ? 's' : ''} uploaded — visible after moderation.`,
      );
      onUploaded?.();
    }
    setItems((list) => {
      const remaining = list.filter((it) => it.state !== 'done');
      if (!remaining.length) onClose();
      return remaining;
    });
  };

  const pending = items.filter((it) => it.state !== 'done').length;

  return (
    <Modal
      open={open}
      onClose={uploading ? () => {} : onClose}
      size="lg"
      title="Upload photos"
      description={`Real photos help future students most. JPG, PNG or WEBP up to ${maxMb} MB each.`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={upload} disabled={!pending || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? 'Uploading…' : `Upload ${pending || ''} photo${pending === 1 ? '' : 's'}`}
          </button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
        }`}
      >
        <ImagePlus className="h-8 w-8 text-brand-600" />
        <p className="mt-2 text-sm font-semibold text-slate-800">Click to choose photos or drag them here</p>
        <p className="text-xs text-slate-500">Rooms, washrooms, mess, lobby, building — up to 10 at once</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((it) => (
            <li key={it.id} className="flex gap-3 rounded-xl p-2 ring-1 ring-slate-200">
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <img src={it.preview} alt="" className="h-full w-full object-cover" />
                {it.state === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
                  </div>
                )}
                {it.state === 'done' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/70">
                    <CircleCheck className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <input
                  className="input sm:col-span-2"
                  placeholder="Caption, e.g. Double room, 2nd floor"
                  maxLength={200}
                  value={it.caption}
                  onChange={(e) => update(it.id, { caption: e.target.value })}
                  disabled={it.state === 'uploading' || it.state === 'done'}
                />
                <select
                  className="input"
                  value={it.room_id}
                  onChange={(e) => update(it.id, { room_id: e.target.value })}
                  disabled={it.state === 'uploading' || it.state === 'done'}
                >
                  <option value="">Whole hostel (lobby, mess, washroom…)</option>
                  {hostel.rooms?.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {roomTypeLabel(r.room_type)} · {r.is_ac ? 'AC' : 'non-AC'}{r.floor_no !== null ? ` · ${floorLabel(r.floor_no)}` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-500">
                    {it.file.name} · {(it.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  {it.state !== 'uploading' && it.state !== 'done' && (
                    <button onClick={() => removeItem(it.id)} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {it.error && (
                  <p className="flex items-center gap-1 text-xs font-medium text-rose-600 sm:col-span-2">
                    <CircleX className="h-3.5 w-3.5" /> {it.error}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
