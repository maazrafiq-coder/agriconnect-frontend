// Provider: driver + vehicle details, location, ETA, and moving the shipment to its next step.
// The driver's name and phone are required before the shipment can be marked picked up.
import { useRef, useState } from 'react';
import { Modal, Btn } from '../ui';
import { FlowError, SummaryRows } from '../ui/RequestFlowModal';
import T from '../../theme';
import { apiUpdateTracking } from '../../lib/api';
import { describeError } from '../../lib/errors';
import { statusLabel } from './util';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, display: 'block', letterSpacing: '0.3px' };
const FLOW = ['BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
const PHONE = /^\+?[0-9][0-9\s-]{6,17}$/;

export default function TrackingUpdateModal({ request, onClose, onUpdated }) {
  const next = FLOW[FLOW.indexOf(request.status) + 1];
  const [location, setLocation] = useState(request.currentLocation || '');
  const [driverName, setDriverName] = useState(request.driverName || '');
  const [driverPhone, setDriverPhone] = useState(request.driverPhone || '');
  const [plate, setPlate] = useState(request.vehicleRegNo || '');
  const [eta, setEta] = useState(request._raw?.estimatedArrival ? new Date(request._raw.estimatedArrival).toISOString().slice(0, 16) : '');
  // delivery evidence (required to mark DELIVERED)
  const [receiver, setReceiver] = useState(request.deliveryReceiverName || '');
  const [deliveryNote, setDeliveryNote] = useState(request.deliveryNote || '');
  const [qty, setQty] = useState(request.deliveredQuantityTons != null ? String(request.deliveredQuantityTons) : '');
  const [confirming, setConfirming] = useState(false); // review step before marking delivered
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const delivering = next === 'DELIVERED';
  const evidenceProblem = () => {
    if (receiver.trim().length < 2) return 'Enter the name of the person who received the goods before marking the shipment delivered.';
    if (qty !== '' && !(Number(qty) >= 0 && Number(qty) <= 100000)) return 'Delivered quantity must be a number of tons (0 or more).';
    return null;
  };

  const submit = async (advance) => {
    if (lock.current) return;
    setError(null);
    if (driverPhone.trim() && !PHONE.test(driverPhone.trim())) return setError({ kind: 'validation', message: 'Enter a valid phone number (digits, optional leading +).' });
    if (advance && next === 'PICKED_UP' && (!driverName.trim() || !driverPhone.trim())) {
      return setError({ kind: 'validation', message: "Add the driver's name and phone number before marking the shipment as picked up." });
    }
    if (advance && delivering) {
      const p = evidenceProblem();
      if (p) { setConfirming(false); return setError({ kind: 'validation', message: p }); }
      if (!confirming) { setConfirming(true); return; } // go to the confirm step first
    }
    lock.current = true; setBusy(true);
    try {
      const data = {};
      if (location.trim()) data.currentLocation = location.trim();
      if (driverName.trim()) data.driverName = driverName.trim();
      if (driverPhone.trim()) data.driverPhone = driverPhone.trim();
      if (plate.trim()) data.vehicleRegNo = plate.trim();
      if (eta) data.estimatedArrival = new Date(eta).toISOString();
      if (advance && next) data.status = next;
      if (advance && delivering) {
        data.receiverName = receiver.trim();
        if (deliveryNote.trim()) data.deliveryNote = deliveryNote.trim();
        if (qty !== '') data.deliveredQuantityTons = Number(qty);
      }
      await apiUpdateTracking(request.id, data);
      onUpdated();
    } catch (e) { setError(describeError(e)); lock.current = false; setBusy(false); }
  };

  if (confirming) {
    return (
      <Modal title="Confirm delivery" onClose={() => { if (!busy) onClose(); }}>
        <p style={{ fontSize: 12.5, color: T.muted, marginBottom: 12 }}>
          {request.from} → {request.to}{request.transportOrderRef ? ` · Transport order ${request.transportOrderRef}` : ''}{request.requestRef ? ` · Request ref ${request.requestRef}` : ''}
        </p>
        <div style={{ background: T.surface, borderRadius: 10, padding: '4px 14px', marginBottom: 12 }}>
          <SummaryRows rows={[
            { label: 'Received by', value: receiver.trim() },
            { label: 'Delivery note', value: deliveryNote.trim() },
            { label: 'Delivered quantity', value: qty !== '' ? `${Number(qty)} t` : '' },
          ]} />
        </div>
        <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#92400E', lineHeight: 1.55 }}>
          This records the delivery evidence and tells the requester the goods have arrived. They can then acknowledge the delivery, and you can invoice the shipment. It cannot be undone.
        </div>
        <FlowError error={error} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={() => { setError(null); setConfirming(false); }} disabled={busy} style={{ flex: 1 }}>← Back</Btn>
          <Btn variant="primary" onClick={() => submit(true)} disabled={busy} aria-busy={busy} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Confirm delivery'}</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Update shipment & driver" onClose={() => { if (!busy) onClose(); }}>
      <p style={{ fontSize: 12.5, color: T.muted, marginBottom: 16 }}>
        {request.from} → {request.to}{request.requestRef ? ` · ${request.requestRef}` : ''} · Currently <strong>{statusLabel(request.status)}</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 12 }}>
        <div><label htmlFor="tum-dn" style={lbl}>DRIVER NAME</label><input id="tum-dn" style={input} value={driverName} onChange={e => setDriverName(e.target.value)} /></div>
        <div><label htmlFor="tum-dp" style={lbl}>DRIVER PHONE</label><input id="tum-dp" style={input} inputMode="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="+92 300 1234567" /></div>
        <div><label htmlFor="tum-vr" style={lbl}>VEHICLE REGISTRATION</label><input id="tum-vr" style={input} value={plate} onChange={e => setPlate(e.target.value)} placeholder="e.g. LEA-1234" /></div>
      </div>
      <p style={{ fontSize: 11, color: T.muted, margin: '-4px 0 12px' }}>Only the requester and you see the phone number and plate. The public tracking link shows just the driver's first name and initial.</p>
      <div style={{ marginBottom: 12 }}><label htmlFor="tum-loc" style={lbl}>CURRENT LOCATION</label><input id="tum-loc" style={input} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Approaching Gujranwala" /></div>
      <div style={{ marginBottom: 16 }}><label htmlFor="tum-eta" style={lbl}>ESTIMATED ARRIVAL</label><input id="tum-eta" type="datetime-local" style={input} value={eta} onChange={e => setEta(e.target.value)} /></div>
      {delivering && (
        <fieldset style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', margin: '0 0 14px' }}>
          <legend style={{ fontSize: 11, fontWeight: 800, color: T.green, padding: '0 6px' }}>DELIVERY EVIDENCE (needed to mark delivered)</legend>
          <div style={{ marginBottom: 10 }}><label htmlFor="tum-rn" style={lbl}>RECEIVED BY (NAME) *</label><input id="tum-rn" style={input} maxLength={100} value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="Person who signed for the goods" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            <div><label htmlFor="tum-dq" style={lbl}>DELIVERED QUANTITY (TONS, OPTIONAL)</label><input id="tum-dq" type="number" min="0" step="0.01" style={input} value={qty} onChange={e => setQty(e.target.value)} /></div>
            <div><label htmlFor="tum-dnote" style={lbl}>DELIVERY NOTE (OPTIONAL)</label><input id="tum-dnote" style={input} maxLength={500} value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="e.g. 2 bags torn, receiver signed" /></div>
          </div>
        </fieldset>
      )}
      <FlowError error={error} />
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={() => submit(false)} disabled={busy} style={{ flex: 1 }}>{busy ? '…' : 'Save details'}</Btn>
        {next && <Btn variant="primary" onClick={() => submit(true)} disabled={busy} style={{ flex: 1 }}>{busy ? '…' : `Mark ${statusLabel(next)}`}</Btn>}
      </div>
    </Modal>
  );
}
