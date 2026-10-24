// Buyer: make an offer. Form -> review (price, quantity, terms, schedule, explicit
// agreement to the terms) -> success with the server's reference.
import { useState } from 'react';
import RequestFlowModal from '../ui/RequestFlowModal';
import PaymentTermsEditor from '../PaymentTermsEditor';
import PaymentTermsView from '../PaymentTermsView';
import T from '../../theme';
import { adaptOfferRequestBody } from './offerBody';
import { apiSubmitOffer } from '../../lib/api';
import { blankTermsForm, formFromTerms, termsFromForm, validateTermsForm, describeTerms, money } from '../../lib/paymentTerms';
import useRequestId from '../../lib/useRequestId';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };

export default function MakeOfferFlow({ product, onClose, onLogin }) {
  const raw = product._raw || {};
  const listingTerms = raw.paymentTerms || null;
  const [price, setPrice] = useState(String(product.price ?? ''));
  const [qty, setQty] = useState(String(product.minOrder ?? ''));
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(listingTerms ? formFromTerms(listingTerms) : blankTermsForm());
  const [agreed, setAgreed] = useState(false);
  const payload = { productId: raw.id || product.id, price, qty, message, terms: termsFromForm(terms) };
  const requestId = useRequestId(JSON.stringify(payload));
  const total = Number(price) * Number(qty);

  const validate = () => {
    if (!(Number(price) > 0)) return 'Enter the price you offer per unit.';
    if (!(Number(qty) > 0)) return 'Enter the quantity you want.';
    if (Number(qty) < Number(raw.minOrderQty || 0)) return `The minimum order is ${raw.minOrderQty} ${product.unit}.`;
    if (raw.quantity != null && Number(qty) > Number(raw.quantity)) return `Only ${raw.quantity} ${product.unit} available.`;
    return validateTermsForm(terms);
  };

  const form = (
    <>
      <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{product.name}</div>
        <div style={{ fontSize: 12, color: T.muted }}>Asking: {money(product.price)} / {product.unit}</div>
        {listingTerms && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>Seller's terms: {describeTerms(listingTerms)}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label htmlFor="mof-price" style={lbl}>YOUR PRICE (₨ per {product.unit})</label>
          <input id="mof-price" type="number" value={price} onChange={e => setPrice(e.target.value)} style={input} />
        </div>
        <div>
          <label htmlFor="mof-qty" style={lbl}>QUANTITY ({product.unit})</label>
          <input id="mof-qty" type="number" value={qty} onChange={e => setQty(e.target.value)} style={input} />
        </div>
      </div>
      <PaymentTermsEditor value={terms} onChange={setTerms} idPrefix="mof-terms" />
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="mof-msg" style={lbl}>MESSAGE TO SELLER</label>
        <textarea id="mof-msg" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Introduce yourself, mention delivery location…" style={{ ...input, resize: 'vertical' }} />
      </div>
      {total > 0 && (
        <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.muted }}>Total estimated value</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{money(total)}</div>
        </div>
      )}
    </>
  );

  const review = (
    <>
      <div style={{ background: T.surface, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
        <div><strong>{product.name}</strong></div>
        <div>{money(price)} per {product.unit} × {qty} {product.unit} = <strong>{money(total)}</strong></div>
        {message && <div style={{ fontStyle: 'italic', color: T.muted, marginTop: 4 }}>“{message}”</div>}
      </div>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <PaymentTermsView terms={termsFromForm(terms)} total={total} />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, cursor: 'pointer' }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
        <span>I agree to these payment terms. If the seller accepts this offer, they become the terms of the order and cannot be changed afterwards.</span>
      </label>
    </>
  );

  return (
    <RequestFlowModal
      title="Make an Offer"
      stepLabels={['Offer', 'Review', 'Sent']}
      form={form}
      validate={validate}
      review={review}
      reviewTitle="Review your offer"
      reviewNotice="The seller can accept, decline or counter. Nothing is agreed until someone accepts a round."
      reviewLabel="Review offer →"
      confirmLabel="Send offer"
      confirmingLabel="Sending…"
      onSubmit={async () => {
        if (!agreed) { const e = new Error('Tick the box to confirm you agree to the payment terms.'); e.status = 400; throw e; }
        return apiSubmitOffer(adaptOfferRequestBody(payload, true), requestId());
      }}
      success={(res) => ({
        icon: '✅', title: 'Offer sent',
        reference: res?.id ? `Offer ${String(res.id).slice(0, 8).toUpperCase()}` : undefined,
        message: 'The seller has been notified and has 72 hours to respond.',
        rows: [
          { label: 'Price', value: `${money(price)} per ${product.unit}` },
          { label: 'Quantity', value: `${qty} ${product.unit}` },
          { label: 'Total', value: money(total) },
          { label: 'Payment terms', value: describeTerms(termsFromForm(terms)) },
        ],
        status: 'Awaiting seller response',
        nextSteps: ['Track this offer under Buyer Portal → Offers.', 'If the seller counters, you can accept, counter back or decline.'],
      })}
      onClose={onClose}
      onLogin={onLogin}
    />
  );
}
