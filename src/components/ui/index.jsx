import { useEffect, useId, useRef } from 'react';
import T from '../../theme';
import { clickable } from '../../lib/a11y';

export const Btn = ({ children, variant = 'primary', size = 'md', onClick, style = {}, disabled = false, type = 'button', ...rest }) => {
  const vs = {
    primary:   { bg: T.green,   color: '#fff',    border: T.green   },
    secondary: { bg: 'transparent', color: T.green, border: T.green },
    gold:      { bg: T.gold,    color: T.green,   border: T.gold    },
    ghost:     { bg: 'transparent', color: T.muted, border: T.border},
    danger:    { bg: T.danger,  color: '#fff',    border: T.danger  },
    cyan:      { bg: T.cyan,    color: '#fff',    border: T.cyan    },
    teal:      { bg: T.teal,    color: '#fff',    border: T.teal    },
    amber:     { bg: '#92400E', color: '#fff',    border: '#92400E' },
    purple:    { bg: '#7C3AED', color: '#fff',    border: '#7C3AED' },
  };
  const sz = { sm: '5px 11px', md: '9px 18px', lg: '12px 26px' };
  const v = vs[variant] || vs.primary;
  return (
    <button
      {...rest}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: v.bg, color: v.color,
        border: `2px solid ${v.border}`,
        padding: sz[size], borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontSize: size === 'sm' ? 11 : size === 'lg' ? 15 : 13,
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const Badge = ({ label, type = 'green' }) => {
  const ts = {
    green:  { bg: '#DCFCE7', color: '#15803D' },
    gold:   { bg: '#FEF3C7', color: '#B45309' },
    blue:   { bg: '#DBEAFE', color: '#1D4ED8' },
    gray:   { bg: '#F3F4F6', color: '#6B7280' },
    red:    { bg: '#FEE2E2', color: '#DC2626' },
    purple: { bg: '#EDE9FE', color: '#7C3AED' },
  };
  const t = ts[type] || ts.green;
  return (
    <span style={{
      background: t.bg, color: t.color,
      padding: '2px 9px', borderRadius: 12,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
};

export const Card = ({ children, style = {}, onClick }) => (
  <div
    {...(onClick ? clickable(onClick) : {})}
    style={{
      background: T.white, borderRadius: 12,
      border: `1px solid ${T.border}`, padding: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      ...(onClick ? { cursor: 'pointer' } : {}),
      ...style,
    }}
  >
    {children}
  </div>
);

export const Stars = ({ rating }) => (
  <span style={{ color: T.gold, fontSize: 12 }}>
    {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}{' '}
    <span style={{ color: T.muted, fontSize: 11, fontWeight: 600 }}>{rating}</span>
  </span>
);

export const Tabs = ({ tabs, active, onChange, color = T.green }) => {
  const onKeyDown = (e) => {
    const i = tabs.findIndex(([id]) => id === active);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === -1) return;
    e.preventDefault();
    onChange(tabs[next][0]);
    // roving tabindex: move focus to the newly selected tab once it has rendered
    const list = e.currentTarget;
    requestAnimationFrame(() => list.querySelectorAll('[role="tab"]')[next]?.focus());
  };
  return (
    <div role="tablist" onKeyDown={onKeyDown} style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 24, overflowX: 'auto' }}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          tabIndex={active === id ? 0 : -1}
          onClick={() => onChange(id)}
          style={{
            background: 'none', border: 'none',
            padding: '10px 18px', cursor: 'pointer',
            fontSize: 13, fontWeight: active === id ? 700 : 400,
            color: active === id ? color : T.muted,
            borderBottom: active === id ? `3px solid ${color}` : '3px solid transparent',
            fontFamily: 'inherit', marginBottom: -2,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export const MetricPill = ({ label, val, ok }) => {
  const missing = val == null || val === '—';
  const good = !missing && ok;
  return (
    <div style={{
      padding: '10px 12px',
      background: missing ? '#F9FAFB' : good ? '#F0FDF4' : '#FEF2F2',
      borderRadius: 10,
      border: `1px solid ${missing ? '#E5E7EB' : good ? '#86EFAC' : '#FCA5A5'}`,
    }}>
      <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: missing ? 13 : 18, fontWeight: 800, color: missing ? T.muted : good ? T.green : T.danger }}>{missing ? 'Not provided' : val}</div>
      {!missing && (
        <div style={{ fontSize: 9, color: good ? '#15803D' : T.danger, fontWeight: 700 }}>
          {good ? '✓ Within typical range' : '⚠ Check'}
        </div>
      )}
    </div>
  );
};

// closeOnBackdrop defaults to false: popups (especially in the admin
// portal) should only close via an explicit action or the ✕ button — an
// accidental click just outside the box shouldn't discard an in-progress
// review/form. Pass closeOnBackdrop explicitly where a quick dismiss is
// genuinely desired (e.g. a purely informational dialog).
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({ children, onClose, title, closeOnBackdrop = false, width = 480 }) => {
  const dialogRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    // Move focus into the dialog: the first field if there is one, else the dialog itself.
    const first = dialog?.querySelector('input:not([type="hidden"]), select, textarea');
    (first || dialog)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { onCloseRef.current?.(); return; }
      if (e.key !== 'Tab' || !dialog) return;
      // Keep Tab / Shift+Tab inside the dialog.
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { e.preventDefault(); dialog.focus(); return; }
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === dialog)) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Give focus back to whatever opened the dialog.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, []);

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={e => closeOnBackdrop && e.target === e.currentTarget && onClose()}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} style={{
        background: T.white, borderRadius: 16, padding: 28,
        maxWidth: width, width: '100%',
        maxHeight: '90vh', overflowY: 'auto', outline: 'none',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.green }}>{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.muted, padding: 4, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const SectionTitle = ({ title, subtitle }) => (
  <div style={{ marginBottom: 28 }}>
    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.green, letterSpacing: '-0.4px' }}>{title}</h2>
    {subtitle && <p style={{ margin: '5px 0 0', color: T.muted, fontSize: 13 }}>{subtitle}</p>}
  </div>
);

// ─── API STATE ──────────────────────────────────────────────────────────────
// Standard loading / error(+retry) / empty states for any screen that loads
// data from the API. Replaces the old pattern of silently falling back to
// hardcoded sample data when a request failed, which made real outages and
// bugs invisible to both users and testers.
export const LoadingState = ({ label = 'Loading…' }) => (
  <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '48px 20px', color: T.muted }}>
    <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" style={{
    textAlign: 'center', padding: '40px 20px',
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12,
  }}>
    <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C', marginBottom: 4 }}>
      Couldn't load this data
    </div>
    <div style={{ fontSize: 12, color: '#991B1B', marginBottom: onRetry ? 16 : 0 }}>
      {message || 'Something went wrong talking to the server. Please try again.'}
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          background: '#B91C1C', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Retry
      </button>
    )}
  </div>
);

export const EmptyState = ({ icon = '📭', title = 'Nothing here yet', subtitle }) => (
  <div style={{ textAlign: 'center', padding: '48px 20px', color: T.muted }}>
    <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: subtitle ? 4 : 0 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 12 }}>{subtitle}</div>}
  </div>
);

// One label/value line in a review or success summary. Shared by every
// request/confirmation flow (the warehouse components re-export this).
export const InfoRow = ({ label, value, accent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: accent || T.text, textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</span>
  </div>
);

// Review / confirmation building blocks (they import Modal/Btn from this file,
// so they live in their own modules and are re-exported here for convenience).
export { default as RequestFlowModal, FlowProgress, FlowError, SummaryRows } from './RequestFlowModal';
export { default as ConfirmDialog } from './ConfirmDialog';
