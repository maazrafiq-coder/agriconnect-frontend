import { useState } from 'react';
import { apiAcceptOffer, apiRejectOffer } from '../../lib/api';
import { Card, Btn, LoadingState, ErrorState } from '../ui';
import ConfirmDialog from '../ui/ConfirmDialog';
import AcceptRoundDialog from '../offers/AcceptRoundDialog';
import ProposeRoundFlow from '../offers/ProposeRoundFlow';
import NegotiationTimeline from '../NegotiationTimeline';
import { STATUS_COLORS as SC } from '../../data';
import { currentRound, turnOf } from '../../lib/offerRounds';
import { describeTerms, money } from '../../lib/paymentTerms';
import T from '../../theme';

// ─── SellerOffersTab ───
// Negotiation is round-based: the party who did NOT propose the current round
// may accept it, decline it, or answer with a new round.
export function SellerOffersTab({ setDeclineModal, OFFERS, offersState, loadOffers, loadOrders, loadListings }) {
  const [accepting, setAccepting] = useState(null);   // adapted offer
  const [countering, setCountering] = useState(null); // adapted offer
  const [withdrawing, setWithdrawing] = useState(null);
  const [history, setHistory] = useState(null);       // offer id whose timeline is open

  const refreshAll = () => { loadOffers(); loadOrders(); loadListings(); };

  return (
    <Card>
      <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: T.green }}>All Offers Received</h3>
      {offersState === 'loading' && <LoadingState label="Loading offers…" />}
      {offersState === 'error' && <ErrorState message="Could not load offers." onRetry={loadOffers} />}
      {offersState === 'ready' && OFFERS.length === 0 && <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '20px 0' }}>No offers yet.</p>}
      {offersState === 'ready' && OFFERS.map(o => {
        const raw = o._raw || {};
        const cur = currentRound(raw);
        const turn = turnOf(raw);
        const unit = o.productUnit || 'unit';
        const multi = (raw.rounds || []).length > 1;
        return (
          <div key={o.id} data-focus-id={o.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.buyer}</div>
                <div style={{ fontSize: 12, color: T.muted, margin: '3px 0' }}>
                  {o.product} · Asking: {money(o.asking)} · {o.time}
                </div>
                {cur ? (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>{cur.proposerRole === 'BUYER' ? 'Buyer proposes' : 'You proposed'}:</span>{' '}
                    <strong style={{ color: T.goldText }}>{money(cur.price)}/{unit}</strong> × {cur.quantity} = <strong>{money(Number(cur.price) * cur.quantity)}</strong>
                    <div style={{ color: T.muted, fontSize: 11 }}>{describeTerms(cur.paymentTerms)}</div>
                    {cur.message && <div style={{ fontStyle: 'italic', marginTop: 3 }}>"{cur.message}"</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, marginTop: 4 }}>{o.qty} {unit} · Offered: <strong style={{ color: T.goldText }}>{money(o.offered)}/{unit}</strong></div>
                )}
                {o.status === 'rejected' && raw.rejectionReason && <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>Declined: {raw.rejectionReason}</div>}
                {turn === 'BUYER' && <div style={{ fontSize: 11, color: T.warnText, marginTop: 4 }}>Waiting for the buyer to accept, decline or counter back</div>}
                {raw.rounds?.length > 0 && (
                  <button type="button" onClick={() => setHistory(history === o.id ? null : o.id)} style={{ background: 'none', border: 'none', padding: 0, marginTop: 6, color: T.info, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {history === o.id ? 'Hide negotiation history' : `Negotiation history (${raw.rounds.length} round${raw.rounds.length > 1 ? 's' : ''})`}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  {SC[o.status]?.l}
                </span>
                {turn === 'SELLER' && (
                  <>
                    <Btn variant="primary" size="sm" onClick={() => setAccepting(o)}>Accept</Btn>
                    <Btn variant="secondary" size="sm" onClick={() => setCountering(o)}>{multi ? 'Counter again' : 'Counter'}</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setDeclineModal(o)}>Decline</Btn>
                  </>
                )}
                {turn === 'BUYER' && <Btn variant="ghost" size="sm" onClick={() => setWithdrawing(o)}>Withdraw my counter</Btn>}
              </div>
            </div>
            {history === o.id && (
              <div style={{ background: T.surface, borderRadius: 8, padding: 12, marginTop: 10 }}>
                <NegotiationTimeline rounds={raw.rounds} unit={unit} viewerRole="SELLER" />
              </div>
            )}
          </div>
        );
      })}

      {accepting && (
        <AcceptRoundDialog offer={accepting._raw} role="SELLER" accept={apiAcceptOffer}
          onClose={() => { setAccepting(null); refreshAll(); }} />
      )}
      {countering && (
        <ProposeRoundFlow offer={countering._raw} role="SELLER"
          onClose={() => { setCountering(null); loadOffers(); }} />
      )}
      {withdrawing && (
        <ConfirmDialog
          title="Withdraw your counter-offer" danger confirmLabel="Withdraw counter"
          description="The offer will be closed and the buyer will be told. They would need to make a new offer."
          reasonLabel="Reason for the buyer"
          onConfirm={({ reason }) => apiRejectOffer(withdrawing.id, reason || undefined)}
          onClose={() => { setWithdrawing(null); loadOffers(); }}
        />
      )}
    </Card>
  );
}
