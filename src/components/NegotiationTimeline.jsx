// Multi-round history of an offer: who proposed what, in order, with the
// terms and the outcome of each round.
import T from '../theme';
import { describeTerms, money } from '../lib/paymentTerms';

const STATUS = {
  CURRENT:    { label: 'Awaiting response', bg: '#FEF3C7', c: '#92400E' },
  SUPERSEDED: { label: 'Replaced',          bg: '#F3F4F6', c: '#4B5563' },
  ACCEPTED:   { label: 'Accepted',          bg: '#DCFCE7', c: '#166534' },
  DECLINED:   { label: 'Declined',          bg: '#FEE2E2', c: '#991B1B' },
  WITHDRAWN:  { label: 'Withdrawn',         bg: '#F3F4F6', c: '#4B5563' },
  EXPIRED:    { label: 'Expired',           bg: '#F3F4F6', c: '#4B5563' },
};

// rounds: raw OfferRound rows; viewerRole: 'BUYER' | 'SELLER'
export default function NegotiationTimeline({ rounds = [], unit = '', viewerRole }) {
  if (!rounds.length) return <div style={{ fontSize: 12, color: T.muted }}>No negotiation history recorded.</div>;
  return (
    <ol aria-label="Negotiation history" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rounds.map(r => {
        const st = STATUS[r.status] || STATUS.SUPERSEDED;
        const who = r.proposerRole === viewerRole ? 'You' : (r.proposerRole === 'BUYER' ? 'Buyer' : 'Seller');
        const total = Number(r.price) * Number(r.quantity);
        return (
          <li key={r.id} data-testid="round" style={{ borderLeft: `3px solid ${r.status === 'CURRENT' ? T.gold : T.border}`, padding: '4px 0 10px 12px', marginLeft: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>Round {r.roundNo} · {who} proposed</div>
              <span style={{ background: st.bg, color: st.c, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 12, margin: '3px 0' }}>
              <strong>{money(r.price)}</strong>{unit ? ` per ${unit}` : ''} × {r.quantity} = <strong>{money(total)}</strong>
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>{describeTerms(r.paymentTerms)}</div>
            {r.message && <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 3 }}>“{r.message}”</div>}
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{new Date(r.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </li>
        );
      })}
    </ol>
  );
}
