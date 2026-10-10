import T from '../../theme';

export const inputStyle = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`,
  borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};

export const labelStyle = { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 5, display: 'block' };

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
