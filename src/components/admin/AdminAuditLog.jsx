import { useEffect, useState } from 'react';
import { apiAdminGetAuditLog } from '../../lib/api';
import { Card, Btn } from '../ui';
import T from '../../theme';

const fmt = (d) => new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const pretty = (a) => (a || '').replace(/_/g, ' ');

// Read-only trail of sensitive admin/moderator actions (KYC decisions, listing
// approvals, lien decisions, fee & price changes, dispute resolutions…).
export default function AdminAuditLog() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState('loading');

  const load = () => {
    setState('loading');
    apiAdminGetAuditLog({ action: action.trim() || undefined, page, limit: 25 })
      .then(res => { setRows(res.data || []); setMeta(res.meta || {}); setState('ready'); })
      .catch(() => setState('error'));
  };
  useEffect(load, [page]);

  return (
    <div>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: T.green }}>Audit Log</h2>
      <p style={{ margin: '0 0 16px', fontSize: 12.5, color: T.muted }}>Who did what, and when, for sensitive admin actions.</p>
      <form onSubmit={e => { e.preventDefault(); setPage(1); load(); }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input value={action} onChange={e => setAction(e.target.value)} placeholder="Filter by action, e.g. kyc_approved"
          style={{ flex: 1, maxWidth: 320, padding: '8px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
        <Btn type="submit" variant="secondary" size="sm">Filter</Btn>
      </form>
      <Card style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: T.surface, textAlign: 'left' }}>
              {['When', 'Who', 'Action', 'On', 'Details'].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10.5, color: T.muted, letterSpacing: 0.4 }}>{h.toUpperCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {state === 'loading' && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: T.muted }}>Loading…</td></tr>}
            {state === 'error' && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: T.danger }}>Could not load the audit log.</td></tr>}
            {state === 'ready' && rows.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No entries yet.</td></tr>}
            {state === 'ready' && rows.map(r => (
              <tr key={r.id} style={{ borderTop: `1px solid ${T.border}` }}>
                <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: T.muted }}>{fmt(r.createdAt)}</td>
                <td style={{ padding: '9px 12px' }}>{r.actor?.name || r.userId?.slice(0, 8) || 'System'}{r.actor?.role ? <span style={{ color: T.muted }}> · {r.actor.role}</span> : null}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700 }}>{pretty(r.action)}</td>
                <td style={{ padding: '9px 12px', color: T.muted }}>{r.entityType}{r.entityId ? ` · ${String(r.entityId).slice(0, 8)}` : ''}</td>
                <td style={{ padding: '9px 12px', color: T.muted, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.details ? JSON.stringify(r.details) : ''}>{r.details ? JSON.stringify(r.details) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: T.muted }}>
        <span>{meta.total || 0} entries</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Btn variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
          <span>Page {meta.page || page} / {meta.totalPages || 1}</span>
          <Btn variant="ghost" size="sm" disabled={page >= (meta.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Next →</Btn>
        </div>
      </div>
    </div>
  );
}
