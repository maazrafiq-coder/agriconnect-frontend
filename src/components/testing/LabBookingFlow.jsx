// src/components/testing/LabBookingFlow.jsx
//
// Lab-test request: details -> review -> confirmation. Used from the Testing page
// and from a product page, so both submit exactly what the person selected.
//
// What the backend really does (testing.service.ts createRequest): it validates that
// the agency offers every selected service, computes the fee on the SERVER and stores
// it with paymentStatus UNPAID. NO payment is taken at booking - so nothing here says
// "pay". The fee shown before sending is an estimate using the same rule; the success
// screen shows the fee the server recorded and the real TST- reference.
import { useState } from 'react';
import T from '../../theme';
import RequestFlowModal from '../ui/RequestFlowModal';
import { apiBookTesting } from '../../lib/api';
import useRequestId from '../../lib/useRequestId';
import { estimateLabFee } from '../../lib/labFee';

const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => `₨${Number(n).toLocaleString()}`;
const fieldStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6, letterSpacing: 0.5 };

export default function LabBookingFlow({
  agency,
  product,            // fixed product (booking from a product page): { id, name, ... }
  products,           // selectable own listings (booking from the Testing page)
  productsLoaded = true,
  onClose,
  onDone,
  onLogin,
}) {
  const [services, setServices] = useState(agency.services || []);
  const [productId, setProductId] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const chosenProduct = product || (products || []).find(p => p.id === productId) || null;
  const requestKey = useRequestId(JSON.stringify([agency.id, services, chosenProduct?.id, date, notes]));
  const fee = estimateLabFee(agency.price, services.length);

  const toggle = (s, on) => setServices(cs => (on ? [...cs, s] : cs.filter(x => x !== s)));

  const validate = () => {
    if (services.length === 0) return 'Select at least one service.';
    if (date && date < today()) return 'Choose today or a future date.';
    return null;
  };

  const form = (
    <div>
      <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.green }}>{agency.name} · {agency.city}</div>
        <div style={{ fontSize: 11, color: T.muted }}>{agency.turnaround} turnaround · basic panel from {money(agency.price)}</div>
      </div>
      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 14px' }}>
        <legend style={labelStyle}>SELECT TESTS</legend>
        {(agency.services || []).map(s => (
          <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={services.includes(s)} onChange={e => toggle(s, e.target.checked)} style={{ width: 14, height: 14 }} /> {s}
          </label>
        ))}
      </fieldset>
      {product ? (
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>PRODUCT TO TEST</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{product.name}</div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="labflow-product" style={labelStyle}>PRODUCT TO TEST (OPTIONAL)</label>
          {productsLoaded && (products || []).length === 0 ? (
            <div style={{ fontSize: 12, color: T.muted }}>You don't have any listed products yet - you can still request testing.</div>
          ) : (
            <select id="labflow-product" value={productId} onChange={e => setProductId(e.target.value)} style={fieldStyle}>
              <option value="">{productsLoaded ? '- No product selected -' : 'Loading your products…'}</option>
              {(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="labflow-date" style={labelStyle}>PREFERRED DATE (OPTIONAL)</label>
        <input id="labflow-date" type="date" value={date} min={today()} onChange={e => setDate(e.target.value)} style={fieldStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="labflow-notes" style={labelStyle}>NOTES FOR THE LAB (OPTIONAL)</label>
        <textarea id="labflow-notes" rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} />
      </div>
      <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.muted }}>Estimated fee ({services.length} test{services.length === 1 ? '' : 's'})</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: T.green }}>{money(fee)}</span>
      </div>
    </div>
  );

  const summaryRows = [
    { label: 'Laboratory', value: `${agency.name}, ${agency.city}` },
    { label: 'Tests', value: services.join(', ') },
    { label: 'Product', value: chosenProduct?.name || 'None selected' },
    { label: 'Preferred date', value: date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not specified - the lab will propose one' },
    { label: 'Estimated fee', value: `${money(fee)} (indicative)`, accent: true },
    notes.trim() ? { label: 'Notes', value: notes.trim() } : null,
  ];

  const submit = () => apiBookTesting({
    agencyId: agency.userId || agency.id,
    productId: chosenProduct?.id,
    servicesRequested: services,
    scheduledDate: date || undefined,
    notes: notes.trim() || undefined,
  }, requestKey());

  return (
    <RequestFlowModal
      title={`Request Lab Test - ${agency.name}`}
      stepLabels={['Details', 'Review', 'Sent']}
      form={form}
      canReview={services.length > 0}
      validate={validate}
      reviewTitle="Check your test request"
      reviewNotice="No payment is taken now. The fee above is an estimate calculated by AgriConnect from the lab's rates - the lab confirms the final amount and schedule."
      summaryRows={summaryRows}
      confirmLabel="Send Test Request"
      confirmingLabel="Sending…"
      onSubmit={submit}
      success={(res) => ({
        icon: '🧪',
        title: 'Test request sent',
        reference: res?.requestNumber,
        referenceLabel: 'Reference',
        message: `${agency.name} has been notified. Nothing has been paid.`,
        rows: [
          { label: 'Laboratory', value: agency.name },
          { label: 'Tests', value: services.join(', ') },
          { label: 'Product', value: chosenProduct?.name },
          { label: 'Preferred date', value: date ? new Date(date).toLocaleDateString('en-GB') : undefined },
          { label: 'Fee recorded', value: res?.fee != null ? `${money(Number(res.fee))} (to be confirmed by the lab)` : `${money(fee)} (estimate)` },
        ],
        status: 'Requested - awaiting the lab',
        nextSteps: [
          'The lab reviews the request and confirms the sample hand-over and schedule.',
          'Follow progress from the Testing tab of your dashboard.',
          'When the report is ready you can download it there.',
        ],
      })}
      onClose={onClose}
      onDone={onDone || onClose}
      onLogin={onLogin}
    />
  );
}
