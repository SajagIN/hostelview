import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { floorLabel, roomTypeLabel, timeAgo } from '../lib/format.js';

export default function Lightbox({ photos, index, onClose }) {
  const [i, setI] = useState(index ?? 0);
  const open = index !== null && index !== undefined && photos?.length > 0;

  useEffect(() => {
    if (open) setI(index);
  }, [index, open]);

  const prev = useCallback(() => setI((v) => (v - 1 + photos.length) % photos.length), [photos]);
  const next = useCallback(() => setI((v) => (v + 1) % photos.length), [photos]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, prev, next]);

  if (!open) return null;
  const photo = photos[Math.min(i, photos.length - 1)];
  const where = photo.room_type
    ? `${roomTypeLabel(photo.room_type)} room${photo.floor_no !== null && photo.floor_no !== undefined ? ` · ${floorLabel(photo.floor_no)}` : ''}`
    : 'Hostel area';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col bg-slate-950/95 text-white">
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-white/70">
          {i + 1} / {photos.length}
        </span>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={onClose}>
        <img
          key={photo.url}
          src={photo.url}
          alt={photo.caption || 'Hostel photo'}
          className="max-h-full max-w-full animate-fade-in rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 rounded-full bg-white/10 p-3 hover:bg-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 rounded-full bg-white/10 p-3 hover:bg-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="px-4 pt-3 pb-4 text-center">
        <p className="font-medium">{photo.caption || 'Untitled photo'}</p>
        <p className="mt-0.5 text-sm text-white/60">
          {where}
          {photo.uploader_name ? ` · by ${photo.uploader_name}` : ''}
          {photo.created_at ? ` · ${timeAgo(photo.created_at)}` : ''}
        </p>
        {photos.length > 1 && (
          <div className="scrollbar-none mx-auto mt-3 flex max-w-3xl justify-center gap-2 overflow-x-auto">
            {photos.map((p, n) => (
              <button
                key={p.photo_id ?? p.url}
                onClick={() => setI(n)}
                className={`h-12 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition ${n === i ? 'ring-white' : 'opacity-50 ring-transparent hover:opacity-90'}`}
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
