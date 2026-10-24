// Request a transport quote from one transporter: details -> review -> success (shows the TRQ- reference).
// Sends the request straight to the chosen transporter (providerId); no price exists until they quote.
import { useState } from 'react';
import RequestFlowModal from '../ui/RequestFlowModal';
import T from '../../theme';
import { apiCreateTransportRequest } from '../../lib/api';
import useRequestId from '../../lib/useRequestId';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 12 };
const PHONE = /^\+?[0-9][0-9\s-]{6,17}$/;
const city = (v) => v.split(',')[0].trim();
const vehicleLabel = (v) => (v || '').split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

// provider: adapted transporter ({ id, userId, name, price, _raw.vehicleTypes }); initial: { pickup, delivery }
export default function CreateTransportRequestFlow({ provider, initial = {}, onClose, onDone, onViewRequests }) {
  const [f, setF] = useState({
    pickup: initial.pickup || '', delivery: initial.delivery || '', vehicleType: provider._raw?.vehicleTypes?.[0] || '',
    requiredDate: '', deliveryDeadline: '', commodity: '', cargoType: '', cargo: '', weight: '', specialHandling: '',
    contactName: '', contactPhone: '',
  });
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  const providerId = provider.userId || provider.id;
  const payload = {
    providerId,
    pickupLocation: f.pickup.trim(), pickupCity: city(f.pickup),
    deliveryLocation: f.delivery.trim(), deliveryCity: city(f.delivery),
    vehicleType: f.vehicleType || undefined,
    requiredDate: f.requiredDate || undefined,
    deliveryDeadline: f.deliveryDeadline || undefined,
    commodity: f.commodity.trim() || undefined,
    cargoType: f.cargoType.trim() || undefined,
    cargoDescription: f.cargo.trim() || undefined,
    cargoWeightTons: f.weight ? Number(f.weight) : undefined,
    specialHandling: f.specialHandling.trim() || undefined,
    contactName: f.contactName.trim() || undefined,
    contactPhone: f.contactPhone.trim() || undefined,
  };
  // one Idempotency-Key per request intent: a retry after a dropped connection cannot create a second request
  const requestKey = useRequestId(JSON.stringify(payload));

  const validate = () => {
    if (!f.pickup.trim() || !f.delivery.trim()) return 'Enter both pickup and delivery locations.';
    if (f.weight && !(Number(f.weight) > 0)) return 'Weight must be greater than zero (or leave it empty).';
    if (f.requiredDate && f.deliveryDeadline && f.deliveryDeadline < f.requiredDate) return 'The delivery deadline cannot be before the pickup date.';
    if (f.contactPhone.trim() && !PHONE.test(f.contactPhone.trim())) return 'Enter a valid contact phone number (digits, optional leading +).';
    return null;
  };

  const field = (id, label, node) => <div><label htmlFor={`ctr-${id}`} style={lbl}>{label}</label>{node}</div>;
  const form = (
    <>
      <div style={grid}>
        {field('pickup', 'PICKUP LOCATION', <input id="ctr-pickup" style={input} value={f.pickup} onChange={set('pickup')} placeholder="e.g. Sheikhupura, Punjab" />)}
        {field('delivery', 'DELIVERY LOCATION', <input id="ctr-delivery" style={input} value={f.delivery} onChange={set('delivery')} placeholder="e.g. Karachi, Sindh" />)}
      </div>
      <div style={grid}>
        {field('vehicle', 'VEHICLE TYPE', (
          <select id="ctr-vehicle" style={input} value={f.vehicleType} onChange={set('vehicleType')}>
            {(provider._raw?.vehicleTypes || []).map(v => <option key={v} value={v}>{vehicleLabel(v)}</option>)}
          </select>
        ))}
        {field('weight', 'WEIGHT (TONS)', <input id="ctr-weight" type="number" min="0" step="0.1" style={input} value={f.weight} onChange={set('weight')} />)}
      </div>
      <div style={grid}>
        {field('date', 'PICKUP DATE', <input id="ctr-date" type="date" style={input} value={f.requiredDate} min={new Date().toISOString().slice(0, 10)} onChange={set('requiredDate')} />)}
        {field('deadline', 'DELIVERY DEADLINE (OPTIONAL)', <input id="ctr-deadline" type="date" style={input} value={f.deliveryDeadline} min={f.requiredDate || new Date().toISOString().slice(0, 10)} onChange={set('deliveryDeadline')} />)}
      </div>
      <div style={grid}>
        {field('commodity', 'COMMODITY', <input id="ctr-commodity" style={input} maxLength={100} value={f.commodity} onChange={set('commodity')} placeholder="e.g. Basmati rice" />)}
        {field('cargotype', 'CARGO TYPE / PACKING', <input id="ctr-cargotype" style={input} maxLength={100} value={f.cargoType} onChange={set('cargoType')} placeholder="e.g. 50 kg bags" />)}
      </div>
      <div style={{ marginBottom: 12 }}>
        {field('cargo', 'CARGO DESCRIPTION (OPTIONAL)', <input id="ctr-cargo" style={input} value={f.cargo} onChange={set('cargo')} />)}
      </div>
      <div style={{ marginBottom: 12 }}>
        {field('handling', 'SPECIAL HANDLING (OPTIONAL)', <textarea id="ctr-handling" rows={2} maxLength={500} style={input} value={f.specialHandling} onChange={set('specialHandling')} placeholder="e.g. Keep dry, covered truck, unload by hand" />)}
      </div>
      <div style={{ ...grid, marginBottom: 4 }}>
        {field('cname', 'CONTACT NAME (OPTIONAL)', <input id="ctr-cname" style={input} maxLength={100} value={f.contactName} onChange={set('contactName')} />)}
        {field('cphone', 'CONTACT PHONE (OPTIONAL)', <input id="ctr-cphone" style={input} inputMode="tel" value={f.contactPhone} onChange={set('contactPhone')} placeholder="+92 300 1234567" />)}
      </div>
      <p style={{ fontSize: 11, color: T.muted, margin: '0 0 14px' }}>Contact details default to your profile. Only you and the transporter see them.</p>
    </>
  );

  const rows = [
    { label: 'Transporter', value: provider.name },
    { label: 'Pickup', value: f.pickup.trim() },
    { label: 'Delivery', value: f.delivery.trim() },
    { label: 'Vehicle', value: vehicleLabel(f.vehicleType) },
    { label: 'Pickup date', value: f.requiredDate },
    { label: 'Delivery deadline', value: f.deliveryDeadline },
    { label: 'Commodity', value: f.commodity.trim() },
    { label: 'Cargo type', value: f.cargoType.trim() },
    { label: 'Cargo', value: f.cargo.trim() },
    { label: 'Weight', value: f.weight ? `${f.weight} t` : '' },
    { label: 'Special handling', value: f.specialHandling.trim() },
    { label: 'Contact', value: [f.contactName.trim(), f.contactPhone.trim()].filter(Boolean).join(' · ') || 'Your profile details' },
  ];

  return (
    <RequestFlowModal
      title={`Request a quote - ${provider.name}`}
      stepLabels={['Details', 'Review', 'Done']}
      form={form}
      validate={validate}
      reviewNotice={`No price is fixed yet. ${provider.name} will review this request and send a quote${provider.price ? ` (indicative rate: ${provider.price})` : ''}. You decide whether to accept it.`}
      summaryRows={rows}
      confirmLabel="Send quote request"
      confirmingLabel="Sending…"
      onSubmit={async () => {
        const req = await apiCreateTransportRequest(payload, requestKey());
        if (!req?.id) throw new Error('Could not create the transport request.');
        return req;
      }}
      success={(res) => ({
        icon: '🚛', title: 'Quote request sent',
        reference: res?.requestRef || res?.requestNumber,
        referenceLabel: 'Request ref',
        status: `Waiting for ${provider.name} to quote`,
        message: `${provider.name} has been notified. You will see their quote in the Transport tab of your dashboard.`,
        nextSteps: ['Review the quote (price, charges, payment terms, conditions).', 'Accept it, counter it or reject it. Nothing is booked until you accept.'],
        secondary: onViewRequests ? { label: 'View my requests', onClick: onViewRequests } : undefined,
      })}
      onClose={onClose}
      onDone={onDone || onClose}
    />
  );
}
