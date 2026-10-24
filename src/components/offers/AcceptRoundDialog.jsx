// Accept the current round. Shows exactly what is being agreed - price, quantity,
// total, the payment terms and their schedule - and requires an explicit
// "I accept these payment terms" tick. The seller additionally sees the platform
// fee and what they will receive (a separate seller-side section; never shown
// to the buyer). Sends the round id that was reviewed, so a newer round
// (409) can never be accepted by mistake.
import ConfirmDialog from '../ui/ConfirmDialog';
import PaymentTermsView from '../PaymentTermsView';
import T from '../../theme';
import { currentRound } from '../../lib/offerRounds';
import { describeTerms, money } from '../../lib/paymentTerms';

// role: 'SELLER' accepts via apiAccept, 'BUYER' via apiAcceptCounter (both passed in as `accept`)
export default function AcceptRoundDialog({ offer, role, accept, onClose, onDone }) {
  const cur = currentRound(offer);
  if (!cur) return null;
  const unit = offer.product?.unit || 'unit';
  const total = Math.round(Number(cur.price) * cur.quantity * 100) / 100;
  const pct = Number(offer.platformFeePct);
  const fee = Number.isFinite(pct) ? Math.round(total * pct) / 100 : null;

  return (
    <ConfirmDialog
      title={role === 'SELLER' ? 'Accept offer' : "Accept seller's counter-offer"}
      confirmLabel="Accept & create order"
      confirmingLabel="Creating order…"
      width={500}
      rows={[
        { label: 'Price', value: `${money(cur.price)} per ${unit}` },
        { label: 'Quantity', value: `${cur.quantity} ${unit}` },
        { label: 'Order total', value: money(total) },
      ]}
      consequences={[
        'An order is created at exactly these terms, and the quantity is taken off the listing.',
        'The payment terms below are frozen on the order and cannot be changed afterwards.',
        ...(role === 'SELLER' ? ['Other open offers that no longer fit the remaining stock are closed.'] : []),
      ]}
      initialState={{ accepted: false }}
      renderFields={(state, set) => (
        <>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: 0.4, marginBottom: 4 }}>PAYMENT TERMS</div>
            <PaymentTermsView terms={cur.paymentTerms} total={total} />
          </div>
          {role === 'SELLER' && fee !== null && (
            <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 12 }} data-testid="seller-settlement">
              <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: 0.4, marginBottom: 4 }}>YOUR SETTLEMENT (not shown to the buyer)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform fee ({pct}%)</span><span>− {money(fee)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}><span>You receive</span><span>{money(total - fee)}</span></div>
              <div style={{ color: T.muted, marginTop: 3 }}>The fee % in force when you accept is frozen on the order.</div>
            </div>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={state.accepted} onChange={e => set({ accepted: e.target.checked })} style={{ marginTop: 3 }} />
            <span>I have reviewed and accept these payment terms: <strong>{describeTerms(cur.paymentTerms)}</strong>.</span>
          </label>
        </>
      )}
      validate={(state) => (state.accepted ? null : 'Tick the box to accept the payment terms.')}
      onConfirm={() => accept(offer.id, { acceptTerms: true, roundId: cur.id })}
      success={(res) => ({
        icon: '🤝', title: 'Order created',
        reference: res?.order?.id ? `Order ${String(res.order.id).slice(0, 8).toUpperCase()}` : undefined,
        message: 'The other party has been notified. The agreed terms are now fixed on the order.',
        rows: [{ label: 'Total', value: money(total) }, { label: 'Payment terms', value: describeTerms(cur.paymentTerms) }],
      })}
      onClose={onClose}
      onDone={onDone || onClose}
    />
  );
}
