import { Card, EmptyState } from '../ui';
import OfferThread from '../OfferThread';
import { STATUS_COLORS as SC } from '../../data';
import T from '../../theme';
import { clickable } from '../../lib/a11y';

// ─── SellerMessagesTab ───
export function SellerMessagesTab({ setActiveConvo, activeOffer, setActiveOffer, CONVOS, convo }) {
  return (
    CONVOS.length === 0 ? (
      <Card><EmptyState icon="✉️" title="No messages yet" subtitle="Conversations appear here when buyers make offers on your listings." /></Card>
    ) : (
    <div className="ac-split" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', minHeight: 440 }}>
      <div style={{ borderRight: `1px solid ${T.border}`, background: T.surface }}>
        <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 13, color: T.green }}>Conversations</div>
        {CONVOS.map((m, i) => (
          <div key={m.name + i} {...clickable(() => setActiveConvo(i))} style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: convo === m ? '#F0FDF4' : 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: convo === m ? 700 : 400, fontSize: 13 }}>{m.name}</div>
              {m.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green }} />}
            </div>
            <div style={{ fontSize: 10, color: T.muted }}>{m.preview}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 13 }}>{convo.name}</div>
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
          <span style={{ color: T.muted }}>Offer:</span>
          <select value={(convo.offers.find(o => o.id === activeOffer) || convo.offers[0]).id} onChange={e => setActiveOffer(e.target.value)}
            style={{ padding: '5px 8px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}>
            {convo.offers.map(o => <option key={o.id} value={o.id}>{o.product} · {o.qty} · ₨{o.offered}/{o.productUnit || 'unit'} · {SC[o.status]?.l || o.status}</option>)}
          </select>
        </div>
        {(() => {
          const cur = convo.offers.find(o => o.id === activeOffer) || convo.offers[0];
          return <OfferThread key={cur.id} offerId={cur._raw?.id || cur.id} closed={['expired', 'withdrawn'].includes(cur.status)} />;
        })()}
      </div>
    </div>
    )
  );
}
