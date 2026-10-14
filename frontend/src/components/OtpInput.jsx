import { useRef } from 'react';

export default function OtpInput({ value, onChange, length = 6, disabled, autoFocus, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return setAt(i, '');
    if (raw.length > 1) {
      const next = digits.slice();
      raw.split('').forEach((d, k) => {
        if (i + k < length) next[i + k] = d;
      });
      onChange(next.join(''));
      refs.current[Math.min(i + raw.length, length - 1)]?.focus();
      return;
    }
    setAt(i, raw);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      setAt(i - 1, '');
      refs.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          className={`h-14 w-11 rounded-xl border-0 bg-white text-center text-2xl font-bold text-slate-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:outline-none sm:w-12 ${
            invalid ? 'ring-rose-400 focus:ring-rose-500' : 'ring-slate-300 focus:ring-brand-600'
          }`}
        />
      ))}
    </div>
  );
}
