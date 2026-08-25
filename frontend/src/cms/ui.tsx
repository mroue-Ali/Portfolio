/**
 * The CMS's small parts.
 *
 * Presentational only — nothing here fetches or knows about a resource. Styling
 * splits the same way the portfolio does it: layout inline, interactive states
 * in `cms.css`, since inline styles outrank class rules and would freeze hover.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cms, mono, type SaveState } from './tokens';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  busy?: boolean;
};

export function Button({
  variant = 'default',
  size = 'md',
  busy = false,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className="cms-btn"
      data-variant={variant}
      data-size={size}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <span className="cms-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className="cms-icon-btn" title={label} aria-label={label} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      style={{
        border: `1px solid ${cms.border}`,
        borderRadius: 6,
        background: cms.surface,
        padding: 22,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 26,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Clash Display', sans-serif",
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ margin: 0, maxWidth: '68ch', color: cms.muted, lineHeight: 1.6 }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
      <h2 style={{ ...mono, margin: 0, color: cms.muted, fontWeight: 500 }}>{children}</h2>
      {hint && <p style={{ margin: 0, color: cms.muted, fontSize: 13 }}>{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'off';
}) {
  const tones = {
    neutral: { color: cms.muted, border: cms.border, background: 'transparent' },
    ok: { color: cms.ok, border: 'rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)' },
    warn: { color: cms.cyan, border: 'rgba(69,217,239,0.35)', background: 'rgba(69,217,239,0.08)' },
    off: { color: cms.muted, border: cms.border, background: 'rgba(255,255,255,0.03)' },
  }[tone];

  return (
    <span
      style={{
        ...mono,
        fontSize: 9.5,
        padding: '3px 7px',
        borderRadius: 3,
        border: `1px solid ${tones.border}`,
        color: tones.color,
        background: tones.background,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: cms.muted, padding: 20 }}>
      <span className="cms-spinner" aria-hidden="true" />
      <span style={{ ...mono }}>{label ?? 'Loading'}</span>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      style={{
        padding: '10px 13px',
        border: '1px solid rgba(255,107,107,0.35)',
        borderRadius: 4,
        background: 'rgba(255,107,107,0.08)',
        color: cms.danger,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: '44px 20px',
        border: `1px dashed ${cms.border}`,
        borderRadius: 6,
        color: cms.muted,
        textAlign: 'center',
      }}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}

/**
 * Delete, in two clicks.
 *
 * A modal for "are you sure" is a lot of machinery for one row; asking in place
 * and forgetting after three seconds gets the same protection with none of it.
 */
export function DeleteButton({
  onConfirm,
  label = 'Delete',
  size = 'sm',
}: {
  onConfirm: () => void;
  label?: string;
  size?: 'md' | 'sm';
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Button
      variant="danger"
      size={size}
      onClick={() => {
        if (armed) {
          window.clearTimeout(timer.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), 3000);
      }}
    >
      {armed ? 'Click again' : label}
    </Button>
  );
}

/** Save state for one form, rendered next to its button. */
export function SaveStatus({ state, error }: { state: SaveState; error?: string | null }) {
  if (state === 'saving') return <span style={{ ...mono, color: cms.muted }}>Saving…</span>;
  if (state === 'saved') return <span style={{ ...mono, color: cms.ok }}>Saved</span>;
  if (state === 'error')
    return <span style={{ ...mono, color: cms.danger }}>{error ?? 'Failed'}</span>;
  return null;
}

/** Transient confirmation, bottom-right. One at a time is plenty. */
export function Toast({ message, tone }: { message: string; tone: 'ok' | 'error' }) {
  return (
    <div
      className="cms-toast"
      role="status"
      style={{
        position: 'fixed',
        right: 22,
        bottom: 22,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 5,
        border: `1px solid ${tone === 'ok' ? 'rgba(74,222,128,0.4)' : 'rgba(255,107,107,0.4)'}`,
        background: cms.raised,
        color: tone === 'ok' ? cms.ok : cms.danger,
        boxShadow: '0 12px 34px rgba(0,0,0,0.45)',
        maxWidth: 380,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

/** Chevron used by every collapsible row. */
export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      style={{
        flex: 'none',
        transform: `rotate(${open ? 90 : 0}deg)`,
        transition: 'transform 0.18s',
        color: cms.muted,
      }}
    >
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
