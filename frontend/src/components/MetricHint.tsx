import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  label: string;
  hint: string;
  detail?: string;
}

/** 指标标题 + 「?」点击展开说明 */
export function MetricLabel({ label, hint, detail }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="metric-hint-wrap">
      <div className="metric-hint-title">
        <span>{label}</span>
        <button
          type="button"
          className={`hint-btn ${open ? 'open' : ''}`}
          aria-label={`${label}说明`}
          aria-expanded={open}
          aria-controls={popoverId}
          onClick={() => setOpen((v) => !v)}
        >
          ?
        </button>
      </div>
      {open && (
        <div id={popoverId} role="tooltip" className="hint-popover">
          <p>{hint}</p>
          {detail ? <p style={{ marginTop: 8 }}>{detail}</p> : null}
        </div>
      )}
    </div>
  );
}
