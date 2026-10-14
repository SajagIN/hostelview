import { Camera, Images } from 'lucide-react';
import HostelCover from './HostelCover.jsx';

export default function PhotoGallery({ photos, type, onOpen, emptyAction }) {
  if (!photos.length) {
    return (
      <HostelCover type={type} className="h-64 rounded-2xl sm:h-80" label="" showIcon={false}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10 text-white">
          <Camera className="h-9 w-9" />
          <p className="font-medium">No approved photos yet</p>
          {emptyAction}
        </div>
      </HostelCover>
    );
  }

  const shown = photos.slice(0, 5);
  const layout = {
    1: ['col-span-4 row-span-2'],
    2: ['col-span-2 row-span-2', 'col-span-2 row-span-2'],
    3: ['col-span-2 row-span-2', 'col-span-2', 'col-span-2'],
    4: ['col-span-2 row-span-2', 'col-span-2', 'col-span-1', 'col-span-1'],
    5: ['col-span-2 row-span-2', 'col-span-1', 'col-span-1', 'col-span-1', 'col-span-1'],
  }[shown.length];

  return (
    <div className="relative grid h-64 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[26rem]">
      {shown.map((p, i) => (
        <button
          key={p.photo_id}
          onClick={() => onOpen(i)}
          className={`group relative overflow-hidden bg-slate-100 ${layout[i]} ${i > 0 ? 'hidden sm:block' : ''}`}
        >
          <img
            src={p.url}
            alt={p.caption || 'Hostel photo'}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          {p.caption && (
            <span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
              {p.caption}
            </span>
          )}
        </button>
      ))}
      <button
        onClick={() => onOpen(0)}
        className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-md hover:bg-white"
      >
        <Images className="h-4 w-4" />
        {photos.length === 1 ? 'View photo' : `View all ${photos.length} photos`}
      </button>
    </div>
  );
}
