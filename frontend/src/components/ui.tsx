import type { ReactNode } from 'react';

export function Panel({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title ? <h2 className="panel-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}

export function StatusBadge({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'muted' | 'ok' | 'warn' | 'err';
}) {
  return <span className={`badge ${tone === 'muted' ? '' : tone}`}>{label}</span>;
}
