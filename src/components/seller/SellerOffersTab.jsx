import { apiAcceptOffer } from '../../lib/api';
import { Card, Btn, LoadingState, ErrorState } from '../ui';
import { STATUS_COLORS as SC } from '../../data';
import T from '../../theme';

// ─── SellerOffersTab ───
export function SellerOffersTab({ setDeclineModal, setCounterModal, OFFERS, offersState, loadOffers, loadOrders, loadListings }) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: T.green }}>All Offers Received</h3>
      {offersState === 'loading' && <LoadingState label="Loading offers…" />}
      {offersState === 'error' && <ErrorState message="Could not load offers." onRetry={loadOffers} />}
      {offersState === 'ready' && OFFERS.length === 0 && <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '20px 0' }}>No offers yet.</p>}
      {offersState === 'ready' && OFFERS.map(o => (
        <div key={o.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{o.buyer}</div>
              <div style={{ fontSize: 12, color: T.muted, margin: '3px 0' }}>
                {o.product} · {o.qty} · Offered: <strong style={{ color: T.goldText }}>₨{o.offered}/{o.productUnit || 'unit'}</strong> vs Asking: ₨{o.asking} · {o.time}
              </div>
              {o.message && <div style={{ fontSize: 12, color: T.text, fontStyle: 'italic', marginTop: 4 }}>"{o.message}"</div>}
              {o.status === 'rejected' && o._raw?.rejectionReason && (
                <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>Declined: {o._raw.rejectionReason}</div>
              )}
              {o.status === 'countered' && o.counter && (
                <div style={{ fontSize: 11, color: T.warnText, marginTop: 4 }}>Your counter: ₨{o.counter}/{o.productUnit || 'unit'} — waiting for the buyer to accept or decline</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {SC[o.status]?.l}
              </span>
              {o.status === 'pending' && (
                <>
                  <Btn variant="primary" size="sm" onClick={async () => {
                    try {
                      await apiAcceptOffer(o._raw?.id || o.id);
                      // Accepting creates the order, deducts stock and may close
                      // competing offers — reload all three instead of patching one row.
                      loadOffers(); loadOrders(); loadListings();
                    } catch (err) {
                      alert(err.message || 'Failed to accept offer');
                    }
                  }}>Accept</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => setCounterModal(o)}>Counter</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDeclineModal(o)}>Decline</Btn>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
