import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiTrackShipment } from '../lib/api';
import { adaptTransportRequest } from '../lib/adapters';
import { LoadingState, ErrorState } from '../components/ui';
import { StatusPill } from '../components/TransportRequestCard';
import T from '../theme';

const STEPS = [['BOOKED', 'Booked'], ['PICKED_UP', 'Picked up'], ['IN_TRANSIT', 'In transit'], ['DELIVERED', 'Delivered']];

export default function TrackingPage() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [state, setState] = useState('loading');
  const load = () => {
    setState('loading');
    apiTrackShipment(id).then(d => { setR(adaptTransportRequest(d)); setState('ready'); }).catch(() => setState('error'));
  };
  useEffect(load, [id]);
  const idx = r ? STEPS.findIndex(([k]) => k === r.status) : -1;
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '36px 20px' }}>
      <h1 style={{ margin: '0 0 18px', fontSize: 22, fontWeight: 900, color: T.green }}>🚛 Shipment Tracking</h1>
      {state === 'loading' && <LoadingState label="Loading shipment…" />}
      {state === 'error' && <ErrorState message="We couldn't find that shipment." onRetry={load} />}
      {state === 'ready' && r && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{r.from} → {r.to}</div>
              {r.transportOrderRef && <div data-testid="tracking-order" style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>Transport order {r.transportOrderRef}</div>}
              {r.requestRef && <div data-testid="tracking-ref" style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Request ref {r.requestRef}</div>}
            </div>
            <StatusPill status={r.status} />
          </div>
          {idx >= 0 ? (
            <div style={{ display: 'flex', marginBottom: 18 }}>
              {STEPS.map(([k, label], i) => (
                <div key={k} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: i <= idx ? '#059669' : T.muted }}>
                  <div style={{ height: 6, borderRadius: 3, background: i <= idx ? '#059669' : '#E5E7EB', marginBottom: 6 }} />{label}
                </div>
              ))}
            </div>
          ) : <p style={{ color: T.muted, fontSize: 13 }}>This shipment hasn't been booked yet.</p>}
          <div style={{ fontSize: 13, lineHeight: 1.9 }}>
            {r.currentLocation && <div>📍 Last known location: <strong>{r.currentLocation}</strong></div>}
            {r.eta && r.status !== 'DELIVERED' && <div>🕒 Estimated arrival: <strong>{r.eta}</strong></div>}
            {r.driverName && <div>👤 Driver: {r.driverName}</div>}
            {r.vehicleType && <div>🚛 Vehicle: {r.vehicleType.replace(/_/g, ' ').toLowerCase()}</div>}
            {r.pickedUpAt && <div>Picked up: {r.pickedUpAt}</div>}
            {r.deliveredAt && <div>Delivered: {r.deliveredAt}</div>}
            <div data-testid="tracking-privacy" style={{ marginTop: 10, fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>
              For privacy this public page shows only the driver's first name and initial. The full driver name, phone number and vehicle registration are available to the buyer and the transporter after they sign in.
            </div>
            {!r.currentLocation && !r.eta && ['BOOKED'].includes(r.status) && <div style={{ color: T.muted }}>No updates from the driver yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
