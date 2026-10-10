import { useState } from 'react';
import { apiAcceptTransportQuote, apiCancelTransportRequest } from '../lib/api';
import { Card, Btn } from './ui';
import T from '../theme';

export const TRANSPORT_STATUS = {
  REQUESTED:  { l: 'Awaiting quote', bg: '#FEF3C7', c: '#B45309' },
  QUOTED:     { l: 'Quote received', bg: '#DBEAFE', c: '#1D4ED8' },
  BOOKED:     { l: 'Booked',         bg: '#D1FAE5', c: '#059669' },
  PICKED_UP:  { l: 'Picked up',      bg: '#E0F2FE', c: '#0369A1' },
  IN_TRANSIT: { l: 'In transit',     bg: '#E0F2FE', c: '#0369A1' },
  DELIVERED:  { l: 'Delivered',      bg: '#DCFCE7', c: '#15803D' },
  CANCELLED:  { l: 'Cancelled',      bg: '#F3F4F6', c: '#6B7280' },
};

export function StatusPill({ status }) {
  const s = TRANSPORT_STATUS[status] || { l: status, bg: '#F3F4F6', c: '#6B7280' };
  return <span style={{ background: s.bg, color: s.c, padding: '3px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{s.l}</span>;
}

// Requester's view of a transport request: accept/decline the provider's quote,
// cancel before pickup, follow the shipment.
export default function TransportRequestCard({ r, onChanged }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const run = async (key, fn) => {
    setBusy(key); setErr('');
    try { await fn(); onChanged?.(); } catch (e) { setErr(e?.message || 'Something went wrong.'); } finally { setBusy(''); }
  };
  const canCancel = ['REQUESTED', 'QUOTED', 'BOOKED'].includes(r.status);
  const trackUrl = `${window.location.origin}/track/${r.id}`;
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.green }}>{r.from} → {r.to}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {r.provider ? `Provider: ${r.provider}` : 'Not yet sent to a provider'}
            {r.requiredDate ? ` · Needed by ${r.requiredDate}` : ''}
            {r.cargo ? ` · ${r.cargo}` : ''}{r.weight ? ` · ${r.weight} t` : ''}
          </div>
        </div>
        <StatusPill status={r.status} />
      </div>

      {r.status === 'QUOTED' && (
        <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
          <div style={{ fontSize: 11, color: T.muted }}>Provider's quote</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0891B2' }}>₨{r.quotedPrice?.toLocaleString()}</div>
          {r.eta && <div style={{ fontSize: 12, color: T.muted }}>Estimated arrival: {r.eta}</div>}
          {r.quoteNote && <div style={{ fontSize: 12, color: T.text, marginTop: 4 }}>“{r.quoteNote}”</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="cyan" size="sm" disabled={!!busy} onClick={() => run('accept', () => apiAcceptTransportQuote(r.id))}>{busy === 'accept' ? 'Accepting…' : `Accept ₨${r.quotedPrice?.toLocaleString()}`}</Btn>
            <Btn variant="secondary" size="sm" disabled={!!busy} onClick={() => run('decline', () => apiCancelTransportRequest(r.id))}>Decline</Btn>
          </div>
        </div>
      )}

      {['BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(r.status) && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.text, lineHeight: 1.7 }}>
          {r.agreedPrice != null && <div>Agreed price: <strong>₨{r.agreedPrice.toLocaleString()}</strong></div>}
          {r.currentLocation && <div>📍 Last known location: {r.currentLocation}</div>}
          {r.eta && r.status !== 'DELIVERED' && <div>ETA: {r.eta}</div>}
          {r.driverName && <div>Driver: {r.driverName}{r.driverPhone ? ` · ${r.driverPhone}` : ''}</div>}
          {r.deliveredAt && <div>Delivered: {r.deliveredAt}</div>}
          <a href={`/track/${r.id}`} style={{ color: '#0891B2', fontWeight: 700, fontSize: 12 }} title={trackUrl}>Open tracking page →</a>
        </div>
      )}

      {err && <div style={{ color: '#B91C1C', fontSize: 12, marginTop: 8 }}>⚠ {err}</div>}
      {canCancel && r.status !== 'QUOTED' && (
        <div style={{ marginTop: 10 }}>
          <Btn variant="secondary" size="sm" disabled={!!busy} onClick={() => { if (window.confirm('Cancel this transport request?')) run('cancel', () => apiCancelTransportRequest(r.id)); }}>Cancel request</Btn>
        </div>
      )}
    </Card>
  );
}
