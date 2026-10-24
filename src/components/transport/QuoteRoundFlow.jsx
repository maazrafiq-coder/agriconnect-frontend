// Provider sends / revises a quote, or the requester counters one.
// Form (prefilled from the current round) -> review -> success with the server's reference (TRQ-…).
// A quote is base freight + itemised extra charges (the server computes the total), dates, vehicle,
// payment terms (same editor as the marketplace), conditions and how long the proposal stays open.
import { useState } from 'react';
import RequestFlowModal from '../ui/RequestFlowModal';
import PaymentTermsEditor from '../PaymentTermsEditor';
import QuoteRoundTimeline from './QuoteRoundTimeline';
import ChargesEditor from './ChargesEditor';
import RoundDetails from './RoundDetails';
import T from '../../theme';
import { apiQuoteTransport, apiCounterTransportQuote } from '../../lib/api';
import { money, blankTermsForm, formFromTerms, termsFromForm, validateTermsForm, describeTerms } from '../../lib/paymentTerms';
import useRequestId from '../../lib/useRequestId';
import { staleAware } from './transportStatus';
import { chargesTotal, cleanCharges, validateCharges, toLocalInput, fromLocalInput, roundTotal } from './charges';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };
const DEFAULT_VALID_HOURS = 72;

// request: adapted request ({ id, from, to, requestRef, currentRound, rounds }); mode: 'quote' | 'counter'
export default function QuoteRoundFlow({ request, mode, onClose, onDone, onStale }) {
  const cur = request.currentRound || null;
  const counter = mode === 'counter';
  const [price, setPrice] = useState(cur ? String(Number(cur.price)) : '');
  const [charges, setCharges] = useState(() => (cur?.additionalCharges || []).map(c => ({ label: c.label, amount: String(c.amount) })));
  const [pickup, setPickup] = useState(toLocalInput(cur?.estimatedPickup));
  const [eta, setEta] = useState(toLocalInput(cur?.estimatedArrival));
  const [vehicle, setVehicle] = useState(cur?.vehicleDetails || '');
  const [terms, setTerms] = useState(() => (cur?.paymentTerms ? formFromTerms(cur.paymentTerms) : blankTermsForm('COD')));
  const [conditions, setConditions] = useState(cur?.conditions || '');
  const [validHours, setValidHours] = useState(String(DEFAULT_VALID_HOURS));
  const [note, setNote] = useState('');

  const payload = {
    price: Number(price), additionalCharges: cleanCharges(charges),
    estimatedPickup: fromLocalInput(pickup), estimatedArrival: fromLocalInput(eta),
    vehicleDetails: vehicle.trim() || undefined, paymentTerms: termsFromForm(terms),
    conditions: conditions.trim() || undefined, validHours: Number(validHours),
    note: note.trim() || undefined, roundId: cur?.id,
  };
  const total = chargesTotal(price, charges);
  const requestId = useRequestId(`${request.id}|${mode}|${JSON.stringify(payload)}`);

  const validate = () => {
    if (!(Number(price) > 0)) return 'Enter a base price greater than zero.';
    const c = validateCharges(charges); if (c) return c;
    if (pickup && eta && new Date(eta) <= new Date(pickup)) return 'Estimated arrival must be after the estimated pickup.';
    if (vehicle.length > 300) return 'Vehicle details are limited to 300 characters.';
    if (conditions.length > 1000) return 'Conditions are limited to 1000 characters.';
    const t = validateTermsForm(terms); if (t) return t;
    const h = Number(validHours);
    if (!Number.isInteger(h) || h < 1 || h > 168) return 'The quote must stay open for a whole number of hours between 1 and 168.';
    if (counter && cur) {
      const same = total === roundTotal(cur) && describeTerms(payload.paymentTerms) === describeTerms(cur.paymentTerms)
        && (payload.conditions || '') === (cur.conditions || '') && pickup === toLocalInput(cur.estimatedPickup)
        && eta === toLocalInput(cur.estimatedArrival) && (payload.vehicleDetails || '') === (cur.vehicleDetails || '');
      if (same) return 'A counter-offer has to change something (price, charges, dates, terms or conditions) - or accept the current one.';
    }
    return null;
  };
  const submit = staleAware(
    () => (counter ? apiCounterTransportQuote : apiQuoteTransport)(request.id, payload, requestId()),
    onStale,
  );

  const form = (
    <>
      <p style={{ fontSize: 12.5, color: T.muted, margin: '0 0 12px' }}>
        {request.from} → {request.to}{request.requestRef ? ` · ${request.requestRef}` : ''}
        {request.cargo ? ` · ${request.cargo}` : ''}{request.weight ? ` · ${request.weight} t` : ''}
      </p>
      {request.rounds?.length > 0 && (
        <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
          <QuoteRoundTimeline rounds={request.rounds} viewerRole={counter ? 'REQUESTER' : 'PROVIDER'} />
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="qrf-price" style={lbl}>{counter ? 'YOUR COUNTER - BASE FREIGHT (₨)' : 'BASE FREIGHT PRICE (₨)'}</label>
        <input id="qrf-price" type="number" min="1" style={input} value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      <ChargesEditor price={price} charges={charges} onChange={setCharges} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="qrf-pickup" style={lbl}>ESTIMATED PICKUP (OPTIONAL)</label>
          <input id="qrf-pickup" type="datetime-local" style={input} value={pickup} onChange={e => setPickup(e.target.value)} />
        </div>
        <div>
          <label htmlFor="qrf-eta" style={lbl}>ESTIMATED ARRIVAL (OPTIONAL)</label>
          <input id="qrf-eta" type="datetime-local" style={input} value={eta} onChange={e => setEta(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="qrf-vehicle" style={lbl}>VEHICLE DETAILS (OPTIONAL)</label>
        <input id="qrf-vehicle" style={input} maxLength={300} value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="e.g. 10-wheeler covered truck, 20 t" />
      </div>
      <PaymentTermsEditor value={terms} onChange={setTerms} idPrefix="qrf-pt" />
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="qrf-cond" style={lbl}>CONDITIONS (OPTIONAL)</label>
        <textarea id="qrf-cond" rows={2} maxLength={1000} style={input} value={conditions} onChange={e => setConditions(e.target.value)} placeholder="e.g. Waiting beyond 6 hours is charged extra; tolls excluded" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="qrf-valid" style={lbl}>THIS {counter ? 'COUNTER' : 'QUOTE'} STAYS OPEN FOR (HOURS, 1-168)</label>
        <input id="qrf-valid" type="number" min="1" max="168" step="1" style={{ ...input, width: 140 }} value={validHours} onChange={e => setValidHours(e.target.value)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="qrf-note" style={lbl}>{counter ? 'MESSAGE TO THE TRANSPORTER (OPTIONAL)' : 'NOTE TO CUSTOMER (OPTIONAL)'}</label>
        <textarea id="qrf-note" rows={2} maxLength={1000} style={input} value={note} onChange={e => setNote(e.target.value)} placeholder={counter ? 'e.g. Can you do it for less if we load ourselves?' : 'e.g. includes loading, excludes tolls'} />
      </div>
    </>
  );

  const review = (
    <div>
      <div style={{ background: T.surface, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{request.from} → {request.to}{request.requestRef ? ` · Request ref ${request.requestRef}` : ''}</div>
        <RoundDetails round={{ ...payload, totalPrice: total }} />
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        <div>Open for: <strong>{validHours} hours</strong></div>
        {note.trim() && <div>Message: <em>“{note.trim()}”</em></div>}
        {cur && <div style={{ color: T.muted }}>Current total on the table: {money(roundTotal(cur))}</div>}
      </div>
    </div>
  );

  return (
    <RequestFlowModal
      title={counter ? 'Counter the quote' : cur ? 'Revise your quote' : 'Send a quote'}
      stepLabels={['Quote', 'Review', 'Done']}
      width={600}
      form={form}
      validate={validate}
      review={review}
      reviewNotice={counter
        ? `The transporter is told your terms and can accept them, revise their quote, or decline. It stays open for ${validHours} hours.`
        : `The requester is told your price and terms and can accept them, counter, or decline. It stays open for ${validHours} hours. Once accepted the price, payment terms and conditions are fixed.`}
      confirmLabel={counter ? 'Send counter-offer' : 'Send quote'}
      confirmingLabel="Sending…"
      onSubmit={submit}
      success={(res) => ({
        title: counter ? 'Counter-offer sent' : 'Quote sent',
        reference: res?.requestRef || request.requestRef,
        referenceLabel: 'Request ref',
        status: counter ? 'Waiting for the transporter' : 'Waiting for the requester',
        rows: [{ label: 'Total price', value: money(total) }, { label: 'Payment terms', value: describeTerms(payload.paymentTerms) }],
        nextSteps: [counter ? 'The transporter can accept, revise or decline.' : 'The requester can accept, counter or decline.', 'You are notified as soon as they respond.'],
      })}
      onClose={onClose}
      onDone={() => { onDone?.(); }}
    />
  );
}
