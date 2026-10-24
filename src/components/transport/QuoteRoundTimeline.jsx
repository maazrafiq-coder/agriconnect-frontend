// History of the price negotiation on a transport request: who proposed what, in order.
import T from '../../theme';
import { money, describeTerms } from '../../lib/paymentTerms';
import { roundTotal } from './charges';
import { fmtDateTime } from './transportStatus';

const STATUS = {
  CURRENT:    { label: 'Awaiting response', bg: '#FEF3C7', c: '#92400E' },
  SUPERSEDED: { label: 'Replaced',          bg: '#F3F4F6', c: '#4B5563' },
  ACCEPTED:   { label: 'Accepted',          bg: '#DCFCE7', c: '#166534' },
  DECLINED:   { label: 'Declined',          bg: '#FEE2E2', c: '#991B1B' },
  WITHDRAWN:  { label: 'Withdrawn',         bg: '#F3F4F6', c: '#4B5563' },
  EXPIRED:    { label: 'Expired',           bg: '#F3F4F6', c: '#4B5563' },
};

// rounds: shaped rounds from the API; viewerRole: 'REQUESTER' | 'PROVIDER'
export default function QuoteRoundTimeline({ rounds = [], viewerRole }) {
  if (!rounds.length) return <div style={{ fontSize: 12, color: T.muted }}>No quote yet.</div>;
  return (
    <ol aria-label="Quote history" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rounds.map(r => {
        const st = STATUS[r.status] || STATUS.SUPERSEDED;
        const who = r.proposerRole === viewerRole ? 'You' : (r.proposerRole === 'PROVIDER' ? 'Transporter' : 'Requester');
        const kind = r.proposerRole === 'PROVIDER' ? 'quoted' : 'countered';
        return (
          <li key={r.id} data-testid="quote-round" style={{ borderLeft: `3px solid ${r.status === 'CURRENT' ? T.gold : T.border}`, padding: '4px 0 10px 12px', marginLeft: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>Round {r.roundNo} · {who} {kind}</div>
              <span style={{ background: st.bg, color: st.c, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 13, margin: '3px 0' }}><strong>{money(roundTotal(r))}</strong></div>
            {r.additionalCharges?.length > 0 && (
              <div data-testid="round-charges" style={{ fontSize: 11, color: T.muted }}>
                Base {money(r.price)}{r.additionalCharges.map(c => ` + ${c.label} ${money(c.amount)}`).join('')}
              </div>
            )}
            {r.estimatedPickup && <div style={{ fontSize: 11, color: T.muted }}>Estimated pickup {fmtDateTime(r.estimatedPickup)}</div>}
            {r.estimatedArrival && <div style={{ fontSize: 11, color: T.muted }}>Estimated arrival {fmtDateTime(r.estimatedArrival)}</div>}
            {r.vehicleDetails && <div style={{ fontSize: 11, color: T.muted }}>Vehicle: {r.vehicleDetails}</div>}
            {r.paymentTerms && <div style={{ fontSize: 11, color: T.muted }}>Payment: {describeTerms(r.paymentTerms)}</div>}
            {r.conditions && <div style={{ fontSize: 11, color: T.muted }}>Conditions: {r.conditions}</div>}
            {r.message && <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 3 }}>“{r.message}”</div>}
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
              {fmtDateTime(r.createdAt)}{r.status === 'CURRENT' && r.expiresAt ? ` · valid until ${fmtDateTime(r.expiresAt)}` : ''}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
