import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { HOSTEL_TYPES } from '../lib/format.js';

export default function HostelCover({ src, alt, type, className = '', children, label = 'No photos yet', imgClassName = '', showIcon = true }) {
  const [failed, setFailed] = useState(false);
  const gradient = HOSTEL_TYPES[type]?.gradient ?? 'from-brand-500 to-sky-600';
  const position = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative';

  if (!src || failed) {
    return (
      <div className={`${position} flex items-center justify-center overflow-hidden bg-linear-to-br ${gradient} ${className}`}>
        {showIcon && <Building2 className="h-10 w-10 text-white/70" strokeWidth={1.5} />}
        {label && <span className="absolute bottom-2.5 left-3 text-xs font-medium text-white/80">{label}</span>}
        {children}
      </div>
    );
  }
  return (
    <div className={`${position} overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
      {children}
    </div>
  );
}
