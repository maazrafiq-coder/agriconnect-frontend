import T from '../../theme';

export const Btn = ({ children, variant = 'primary', size = 'md', onClick, style = {}, disabled = false }) => {
  const vs = {
    primary:   { bg: T.green,   color: '#fff',    border: T.green   },
    secondary: { bg: 'transparent', color: T.green, border: T.green },
    gold:      { bg: T.gold,    color: T.green,   border: T.gold    },
    ghost:     { bg: 'transparent', color: T.muted, border: T.border},
    danger:    { bg: T.danger,  color: '#fff',    border: T.danger  },
    cyan:      { bg: T.cyan,    color: '#fff',    border: T.cyan    },
    teal:      { bg: T.teal,    color: '#fff',    border: T.teal    },
  };
  const sz = { sm: '5px 11px', md: '9px 18px', lg: '12px 26px' };
  const v = vs[variant] || vs.primary;
  return (
    <button
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
    onClick={onClick}
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

export const Tabs = ({ tabs, active, onChange, color = T.green }) => (
  <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 24, overflowX: 'auto' }}>
    {tabs.map(([id, label]) => (
      <button
        key={id}
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

export const MetricPill = ({ label, val, ok }) => (
  <div style={{
    padding: '10px 12px',
    background: ok ? '#F0FDF4' : '#FEF2F2',
    borderRadius: 10,
    border: `1px solid ${ok ? '#86EFAC' : '#FCA5A5'}`,
  }}>
    <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: ok ? T.green : T.danger }}>{val}</div>
    <div style={{ fontSize: 9, color: ok ? '#15803D' : T.danger, fontWeight: 700 }}>
      {ok ? '✓ Good' : '⚠ Check'}
    </div>
  </div>
);

// closeOnBackdrop defaults to false: popups (especially in the admin
// portal) should only close via an explicit action or the ✕ button — an
// accidental click just outside the box shouldn't discard an in-progress
// review/form. Pass closeOnBackdrop explicitly where a quick dismiss is
// genuinely desired (e.g. a purely informational dialog).
export const Modal = ({ children, onClose, title, closeOnBackdrop = false, width = 480 }) => (
  <div
    style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}
    onClick={e => closeOnBackdrop && e.target === e.currentTarget && onClose()}
  >
    <div style={{
      background: T.white, borderRadius: 16, padding: 28,
      maxWidth: width, width: '100%',
      maxHeight: '90vh', overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.green }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.muted, padding: 4, lineHeight: 1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

export const SectionTitle = ({ title, subtitle }) => (
  <div style={{ marginBottom: 28 }}>
    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.green, letterSpacing: '-0.4px' }}>{title}</h2>
    {subtitle && <p style={{ margin: '5px 0 0', color: T.muted, fontSize: 13 }}>{subtitle}</p>}
  </div>
);

// ─── DEMO MODE ──────────────────────────────────────────────────────────────
// Sample/demo data must never be a silent substitute for a failed API call
// (P0 #10). It may only ever appear when explicitly opted into via this env
// var — never as an automatic fallback on error.
export const isDemoMode = () => String(import.meta.env.VITE_DEMO_MODE).toLowerCase() === 'true';

// ─── API STATE ──────────────────────────────────────────────────────────────
// Standard loading / error(+retry) / empty states for any screen that loads
// data from the API. Replaces the old pattern of silently falling back to
// hardcoded sample data when a request failed, which made real outages and
// bugs invisible to both users and testers.
export const LoadingState = ({ label = 'Loading…' }) => (
  <div style={{ textAlign: 'center', padding: '48px 20px', color: T.muted }}>
    <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div style={{
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
