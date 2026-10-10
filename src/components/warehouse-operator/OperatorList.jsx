import { useState, useEffect } from 'react';
import { Card, Btn, LoadingState } from '../ui';
import T from '../../theme';
import { fmt } from './shared';

// ─── INVOICE / GATE-OUT LIST VIEWS (R3·M5) ──────────────────────────────────
export const money = (n) => `₨${Number(n || 0).toLocaleString()}`;

export function OperatorList({ kind, fetcher, onOpen, error }) {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const load = () => {
    setState('loading');
    fetcher().then(d => { setRows(Array.isArray(d) ? d : []); setState('ready'); }).catch(() => setState('error'));
  };
  useEffect(load, []);
  const invoices = kind === 'invoices';
  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <Card><p style={{ margin: 0, fontSize: 13, color: T.danger }}>Could not load. <button onClick={load} style={{ background: 'none', border: 'none', color: T.mid, cursor: 'pointer', fontWeight: 700 }}>Retry</button></p></Card>;
  if (rows.length === 0) return <Card><p style={{ margin: 0, fontSize: 13, color: T.muted }}>{invoices ? 'No invoices yet — generate one from a booking.' : 'No gate-out requests yet.'}</p></Card>;
  const color = (st) => (['PAID', 'APPROVED'].includes(st) ? '#15803D' : ['REJECTED', 'CANCELLED'].includes(st) ? '#B91C1C' : '#B45309');
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#B91C1C' }}>⚠ {error}</div>}
      {rows.map(r => (
        <Card key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{invoices ? r.invoiceNumber : r.passNumber || 'Gate-out request'}</div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
              {r.depositor?.profile?.fullName || 'Depositor'}
              {invoices ? ` · ${money(r.totalAmount ?? r.amount)} · issued ${fmt(r.issuedAt)}` : ` · ${r.quantityTons ? `${r.quantityTons} tons · ` : ''}requested ${fmt(r.createdAt)}`}
            </div>
            {!invoices && r.rejectionNote && <div style={{ fontSize: 11.5, color: '#B91C1C', marginTop: 2 }}>Rejected: {r.rejectionNote}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: color(r.status) }}>{(r.status || '').replace(/_/g, ' ')}</span>
            {(invoices || r.status === 'APPROVED') && <Btn variant="ghost" size="sm" onClick={() => onOpen(r)}>📄 {invoices ? 'PDF' : 'Pass'}</Btn>}
          </div>
        </Card>
      ))}
    </div>
  );
}
