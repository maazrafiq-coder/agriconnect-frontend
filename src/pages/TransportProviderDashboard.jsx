import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetMyProvider, apiRegisterProvider, apiUpdateTracking,
  apiGetMyProviderClarifications, apiRespondToClarification,
} from '../lib/api';
import { Card, Btn, Badge, Tabs, Modal } from '../components/ui';
import MediaManagerModal from '../components/MediaManager';
import ClarificationThread from '../components/ClarificationThread';
import T from '../theme';

const inputStyle = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`,
  borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, display: 'block', letterSpacing: '0.3px' };
const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan'];
const VEHICLE_TYPES = [
  ['SMALL_TRUCK', 'Small Truck'], ['MEDIUM_TRUCK', 'Medium Truck'], ['LARGE_TRUCK', 'Large Truck'],
  ['CONTAINER', 'Container'], ['BULK_CARGO', 'Bulk Cargo'], ['REFRIGERATED', 'Refrigerated'],
];
const STATUS_FLOW = ['REQUESTED', 'QUOTED', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
const STATUS_BADGE = {
  REQUESTED: 'gold', QUOTED: 'gold', BOOKED: 'blue', PICKED_UP: 'blue',
  IN_TRANSIT: 'blue', DELIVERED: 'green', CANCELLED: 'red',
};
const statusLabel = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─── REGISTER FORM ───────────────────────────────────────────────────────────
function RegisterProviderForm({ onRegistered }) {
  const [form, setForm] = useState({
    companyName: '', vehicleTypes: [], maxCapacityTons: '', coverageProvinces: ['Punjab'],
    pricePerKm: '', hasGps: false, hasInsurance: false, licenseNumber: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggle = (key, val) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.companyName) return setError('Company name is required.');
    if (!form.vehicleTypes.length) return setError('Select at least one vehicle type.');
    if (!form.coverageProvinces.length) return setError('Select at least one coverage province.');
    if (!form.maxCapacityTons || !form.pricePerKm) return setError('Capacity and price per km are required.');

    setBusy(true);
    try {
      await apiRegisterProvider({
        ...form,
        maxCapacityTons: Number(form.maxCapacityTons),
        pricePerKm: Number(form.pricePerKm),
      });
      onRegistered();
    } catch (err) {
      setError(err.message || 'Could not register your transport service.');
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 560, margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: T.green }}>List Your Transport Service</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12.5, color: T.muted }}>
        Set up your fleet's listing once — buyers and sellers will be able to book shipments with you.
      </p>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>COMPANY NAME</label>
          <input style={inputStyle} value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g. Pak Logistics Express" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>VEHICLE TYPES</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VEHICLE_TYPES.map(([v, l]) => (
              <button type="button" key={v} onClick={() => toggle('vehicleTypes', v)}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${form.vehicleTypes.includes(v) ? T.mid : T.border}`,
                  background: form.vehicleTypes.includes(v) ? '#EFFDF5' : '#fff',
                  color: form.vehicleTypes.includes(v) ? T.mid : T.muted,
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>COVERAGE PROVINCES</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROVINCES.map(p => (
              <button type="button" key={p} onClick={() => toggle('coverageProvinces', p)}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${form.coverageProvinces.includes(p) ? T.mid : T.border}`,
                  background: form.coverageProvinces.includes(p) ? '#EFFDF5' : '#fff',
                  color: form.coverageProvinces.includes(p) ? T.mid : T.muted,
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>MAX CAPACITY (TONS)</label>
            <input type="number" min="0.1" step="0.1" style={inputStyle} value={form.maxCapacityTons} onChange={e => set('maxCapacityTons', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>PRICE / KM (₨)</label>
            <input type="number" min="0" style={inputStyle} value={form.pricePerKm} onChange={e => set('pricePerKm', e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>LICENSE NUMBER (OPTIONAL)</label>
          <input style={inputStyle} value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.text, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.hasGps} onChange={e => set('hasGps', e.target.checked)} /> GPS tracking
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.text, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.hasInsurance} onChange={e => set('hasInsurance', e.target.checked)} /> Cargo insurance
          </label>
        </div>
        {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <Btn variant="primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Registering…' : 'Register Transport Service'}</Btn>
      </form>
    </Card>
  );
}

// ─── UPDATE TRACKING MODAL ───────────────────────────────────────────────────
function UpdateTrackingModal({ request, onClose, onUpdated }) {
  const idx = STATUS_FLOW.indexOf(request.status);
  const next = STATUS_FLOW[idx + 1];
  const [currentLocation, setLocation] = useState(request.currentLocation || '');
  const [driverName, setDriverName] = useState(request.driverName || '');
  const [driverPhone, setDriverPhone] = useState(request.driverPhone || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (advance) => {
    setError('');
    setBusy(true);
    try {
      const data = { currentLocation, driverName, driverPhone };
      if (advance && next) data.status = next;
      await apiUpdateTracking(request.id, data);
      onUpdated();
    } catch (err) {
      setError(err.message || 'Could not update tracking.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Update Shipment Tracking" onClose={onClose}>
      <p style={{ fontSize: 12.5, color: T.muted, marginBottom: 16 }}>
        {request.pickupCity} → {request.deliveryCity} · Currently <strong>{statusLabel(request.status)}</strong>
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CURRENT LOCATION</label>
        <input style={inputStyle} value={currentLocation} onChange={e => setLocation(e.target.value)} placeholder="e.g. Approaching Gujranwala" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>DRIVER NAME</label>
          <input style={inputStyle} value={driverName} onChange={e => setDriverName(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>DRIVER PHONE</label>
          <input style={inputStyle} value={driverPhone} onChange={e => setDriverPhone(e.target.value)} />
        </div>
      </div>
      {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={() => submit(false)} disabled={busy} style={{ flex: 1 }}>
          {busy ? '…' : 'Save Details'}
        </Btn>
        {next && (
          <Btn variant="primary" onClick={() => submit(true)} disabled={busy} style={{ flex: 1 }}>
            {busy ? '…' : `Mark ${statusLabel(next)}`}
          </Btn>
        )}
      </div>
    </Modal>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function TransportProviderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [clarifications, setClarifications] = useState([]);

  const loadClarifications = () => {
    apiGetMyProviderClarifications('TRANSPORT_PROFILE')
      .then(d => setClarifications(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const handleRespondToClarification = async (id, message, files) => {
    await apiRespondToClarification(id, message, files);
    loadClarifications();
  };

  const load = () => {
    setLoading(true);
    apiGetMyProvider()
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(loadClarifications, []);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: T.muted, fontFamily: 'Inter,sans-serif' }}>Loading your transport dashboard…</div>;
  }

  if (notFound || !data) {
    return (
      <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh', padding: '48px 20px' }}>
        <RegisterProviderForm onRegistered={load} />
      </div>
    );
  }

  const { provider, stats, recentRequests } = data;

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh' }}>
      <div style={{ background: `linear-gradient(135deg,${T.green} 0%,${T.mid} 60%,${T.green} 100%)`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🚚</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.bg }}>{provider.companyName}</h1>
              <p style={{ margin: '3px 0 0', color: T.mint, fontSize: 13 }}>{(provider.coverageProvinces || []).join(', ')} · {provider.isVerified ? '✓ Verified' : 'Pending verification'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="gold" size="sm" onClick={() => setMediaOpen(true)}>📷 Photos & Documents</Btn>
            <Btn variant="secondary" size="sm" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => navigate('/transport')}>View Public Listing</Btn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            ['Total Shipments', stats.totalRequests],
            ['In Progress', stats.pendingRequests],
            ['Delivered', stats.deliveredRequests],
            ['Rating', provider.reviewCount ? `★ ${provider.rating}` : '—'],
          ].map(([label, val]) => (
            <Card key={label} style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.green }}>{val}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
            </Card>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 800, color: T.green, marginBottom: 12 }}>Shipments</h3>
        {recentRequests.length === 0 ? (
          <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No shipments yet — they'll show up here once a customer books your service.</p></Card>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {recentRequests.map(r => (
              <Card key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.pickupCity} → {r.deliveryCity}</div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                    {r.requester?.profile?.fullName || 'Requester'} · {r.cargoWeightTons ? `${r.cargoWeightTons} tons` : ''} {r.agreedPrice ? `· ₨${Number(r.agreedPrice).toLocaleString()}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge label={statusLabel(r.status)} type={STATUS_BADGE[r.status] || 'gray'} />
                  {r.status !== 'DELIVERED' && r.status !== 'CANCELLED' && (
                    <Btn variant="secondary" size="sm" onClick={() => setTrackingRequest(r)}>Update Tracking</Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {clarifications.length > 0 && (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.green, margin: '24px 0 12px' }}>
              🔍 Listing Review {clarifications.filter(c => c.status === 'OPEN').length > 0 && `(${clarifications.filter(c => c.status === 'OPEN').length})`}
            </h3>
            <ClarificationThread
              clarifications={clarifications}
              viewerRole="subject"
              onRespond={handleRespondToClarification}
            />
          </>
        )}
      </div>

      {mediaOpen && (
        <MediaManagerModal
          mode="listing" entityType="transport" entityId={provider.id}
          title="Fleet Photos & Documents"
          onClose={() => setMediaOpen(false)}
        />
      )}

      {trackingRequest && (
        <UpdateTrackingModal
          request={trackingRequest}
          onClose={() => setTrackingRequest(null)}
          onUpdated={() => { setTrackingRequest(null); load(); }}
        />
      )}
    </div>
  );
}
