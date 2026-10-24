// Either party answers the current round with a new proposal (counter / counter back).
// Form (prefilled from the current round) -> review with what changed -> success.
import { useState } from 'react';
import RequestFlowModal from '../ui/RequestFlowModal';
import PaymentTermsEditor from '../PaymentTermsEditor';
import PaymentTermsView from '../PaymentTermsView';
import NegotiationTimeline from '../NegotiationTimeline';
import T from '../../theme';
import { apiProposeRound } from '../../lib/api';
import { currentRound } from '../../lib/offerRounds';
import { formFromTerms, termsFromForm, validateTermsForm, describeTerms, diffRound, money } from '../../lib/paymentTerms';
import useRequestId from '../../lib/useRequestId';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };

// offer: raw offer (with .rounds, .product); role: 'BUYER' | 'SELLER'
export default function ProposeRoundFlow({ offer, role, onClose, onDone }) {
  const cur = currentRound(offer);
  const unit = offer.product?.unit || 'unit';
  const [price, setPrice] = useState(String(cur ? Number(cur.price) : ''));
  const [qty, setQty] = useState(String(cur ? cur.quantity : offer.quantity));
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(formFromTerms(cur?.paymentTerms));
  const payload = { price: Number(price), quantity: Number(qty), paymentTerms: termsFromForm(terms), message: message.trim() || undefined, roundId: cur?.id };
  const requestId = useRequestId(`${offer.id}|${JSON.stringify(payload)}`);
  const total = Number(price) * Number(qty);
  const next = { price: Number(price), quantity: Number(qty), paymentTerms: termsFromForm(terms) };
  const changes = diffRound(cur, next);
  const other = role === 'SELLER' ? 'buyer' : 'seller';

  if (!cur) return null;

  const validate = () => {
    if (!(Number(price) > 0)) return 'Enter a price greater than zero.';
    if (!(Number(qty) > 0)) return 'Enter a quantity greater than zero.';
    const p = offer.product || {};
    if (p.minOrderQty != null && Number(qty) < Number(p.minOrderQty)) return `The minimum order is ${p.minOrderQty} ${unit}.`;
    const t = validateTermsForm(terms);
    if (t) return t;
    if (!changes.length && !message.trim()) return 'Change the price, quantity or terms (or add a message) - otherwise there is nothing new to propose.';
    return null;
  };

  const form = (
    <>
      <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>Current proposal (round {cur.roundNo}, from the {cur.proposerRole === 'BUYER' ? 'buyer' : 'seller'})</div>
        {money(cur.price)} per {unit} × {cur.quantity} = {money(Number(cur.price) * cur.quantity)}
        <div style={{ color: T.muted }}>{describeTerms(cur.paymentTerms)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label htmlFor="prf-price" style={lbl}>YOUR PRICE (₨ per {unit})</label>
          <input id="prf-price" type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ ...input, fontWeight: 700 }} />
        </div>
        <div>
          <label htmlFor="prf-qty" style={lbl}>QUANTITY ({unit})</label>
          <input id="prf-qty" type="number" value={qty} onChange={e => setQty(e.target.value)} style={input} />
        </div>
      </div>
      <PaymentTermsEditor value={terms} onChange={setTerms} idPrefix="prf-terms" />
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="prf-msg" style={lbl}>MESSAGE (optional)</label>
        <textarea id="prf-msg" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Explain your proposal…" style={{ ...input, resize: 'vertical' }} />
      </div>
      {(offer.rounds || []).length > 1 && (
        <details style={{ marginBottom: 12 }}>
          <summary style={{ fontSize: 12, cursor: 'pointer', color: T.muted }}>Negotiation so far</summary>
          <div style={{ marginTop: 8 }}><NegotiationTimeline rounds={offer.rounds} unit={unit} viewerRole={role} /></div>
        </details>
      )}
    </>
  );

  const review = (
    <>
      <div style={{ background: T.surface, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
        <strong>{money(price)}</strong> per {unit} × {qty} {unit} = <strong>{money(total)}</strong>
        {message.trim() && <div style={{ fontStyle: 'italic', color: T.muted, marginTop: 4 }}>“{message.trim()}”</div>}
      </div>
      {changes.length > 0 && (
        <div style={{ marginBottom: 12, fontSize: 12 }}>
          <div style={{ fontWeight: 800, color: T.muted, fontSize: 11, letterSpacing: 0.4, marginBottom: 4 }}>WHAT CHANGED</div>
          {changes.map(c => <div key={c.label} style={{ padding: '2px 0' }}><strong>{c.label}:</strong> {c.value}</div>)}
        </div>
      )}
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px' }}>
        <PaymentTermsView terms={termsFromForm(terms)} total={total} />
      </div>
    </>
  );

  return (
    <RequestFlowModal
      title={role === 'SELLER' ? 'Counter-offer' : 'Counter back'}
      stepLabels={['Proposal', 'Review', 'Sent']}
      form={form}
      validate={validate}
      review={review}
      reviewTitle="Review your proposal"
      reviewNotice={`This replaces the current proposal. The ${other} then has 72 hours to accept, decline or answer.`}
      confirmLabel="Send proposal"
      confirmingLabel="Sending…"
      onSubmit={() => apiProposeRound(offer.id, payload, requestId())}
      success={(res) => {
        const rounds = res?.rounds || [];
        const n = rounds.length ? rounds[rounds.length - 1].roundNo : undefined;
        return {
          icon: '📨', title: 'Proposal sent', reference: n ? `Round ${n}` : undefined,
          message: `The ${other} has been notified.`,
          rows: [{ label: 'Total', value: money(total) }, { label: 'Payment terms', value: describeTerms(termsFromForm(terms)) }],
          status: `Awaiting ${other}'s response`,
        };
      }}
      onClose={onClose}
      onDone={onDone || onClose}
    />
  );
}
