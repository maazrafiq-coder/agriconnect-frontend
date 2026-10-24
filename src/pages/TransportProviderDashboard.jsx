import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetMyProvider, apiRegisterProvider, apiUpdateMyProvider, apiGetMyTransportRequests,
  apiGetMyProviderClarifications, apiRespondToClarification,
} from '../lib/api';
import { adaptTransportRequests } from '../lib/adapters';
import TransportRequestCard from '../components/TransportRequestCard';
import { Card, Btn, LoadingState } from '../components/ui';
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

// ─── REGISTER FORM ───────────────────────────────────────────────────────────
function RegisterProviderForm({ onRegistered, initial, onCancel }) {
  const editing = !!initial;
  const [form, setForm] = useState(initial ? {
    companyName: initial.companyName || '', vehicleTypes: initial.vehicleTypes || [], maxCapacityTons: initial.maxCapacityTons ?? '',
    coverageProvinces: initial.coverageProvinces || [], pricePerKm: initial.pricePerKm ?? '', hasGps: !!initial.hasGps,
    hasInsurance: !!initial.hasInsurance, licenseNumber: initial.licenseNumber || '',
  } : {
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
      const payload = {
        ...form,
        maxCapacityTons: Number(form.maxCapacityTons),
        pricePerKm: Number(form.pricePerKm),
      };
      if (editing) { if (!payload.licenseNumber) delete payload.licenseNumber; await apiUpdateMyProvider(payload); }
      else await apiRegisterProvider(payload);
      onRegistered();
    } catch (err) {
      setError(err.message || 'Could not register your transport service.');
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 560, margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: T.green }}>{editing ? 'Edit Your Listing' : 'List Your Transport Service'}</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12.5, color: T.muted }}>
        {editing ? 'Changes to your public listing are saved immediately.' : 'Set up your fleet\'s listing once — buyers and sellers can then request quotes from you.'}
      </p>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="transportproviderdashboard-f1" style={labelStyle}>COMPANY NAME</label>
          <input id="transportproviderdashboard-f1" style={inputStyle} value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g. Pak Logistics Express" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>VEHICLE TYPES</div>
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
          <div style={labelStyle}>COVERAGE PROVINCES</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 12 }}>
          <div>
            <label htmlFor="transportproviderdashboard-f2" style={labelStyle}>MAX CAPACITY (TONS)</label>
            <input id="transportproviderdashboard-f2" type="number" min="0.1" step="0.1" style={inputStyle} value={form.maxCapacityTons} onChange={e => set('maxCapacityTons', e.target.value)} />
          </div>
          <div>
            <label htmlFor="transportproviderdashboard-f3" style={labelStyle}>PRICE / KM (₨)</label>
            <input id="transportproviderdashboard-f3" type="number" min="0" style={inputStyle} value={form.pricePerKm} onChange={e => set('pricePerKm', e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="transportproviderdashboard-f4" style={labelStyle}>LICENSE NUMBER (OPTIONAL)</label>
          <input id="transportproviderdashboard-f4" style={inputStyle} value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} />
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
        <Btn type="submit" variant="primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Saving…' : editing ? 'Save Changes' : 'Register Transport Service'}</Btn>
        {editing && <Btn type="button" variant="ghost" onClick={onCancel} style={{ width: '100%', marginTop: 8 }}>Cancel</Btn>}
      </form>
    </Card>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function TransportProviderDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [shipmentsState, setShipmentsState] = useState('loading');
  const [editing, setEditing] = useState(false);
  const [clarifications, setClarifications] = useState([]);

  const loadClarifications = () => {
    apiGetMyProviderClarifications('TRANSPORT_PROFILE')
      .then(d => setClarifications(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const handleRespondToClarification = async (id, message, files, reqId) => {
    const saved = await apiRespondToClarification(id, message, files, reqId);
    loadClarifications();
    return saved;
  };

  // Shaped requests (rounds, turn, driver, invoice, disputes) for the shipment cards.
  const loadShipments = () => {
    apiGetMyTransportRequests('provider')
      .then(d => { setShipments(adaptTransportRequests(Array.isArray(d) ? d : [])); setShipmentsState('ready'); })
      .catch(() => setShipmentsState('error'));
  };
  const load = () => {
    setLoading(true);
    apiGetMyProvider()
      .then(d => { setData(d); loadShipments(); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(loadClarifications, []);

  if (loading) {
    return <LoadingState label="Loading your transport dashboard…" />;
  }

  if (notFound || !data) {
    return (
      <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh', padding: '48px 20px' }}>
        <RegisterProviderForm onRegistered={load} />
      </div>
    );
  }

  const { provider, stats } = data;

  if (editing) {
    return (
      <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh', padding: '48px 20px' }}>
        <RegisterProviderForm initial={provider} onCancel={() => setEditing(false)} onRegistered={() => { setEditing(false); load(); }} />
      </div>
    );
  }

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
            <Btn variant="gold" size="sm" onClick={() => setEditing(true)}>✏️ Edit Listing</Btn>
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
        {shipmentsState === 'loading' && <LoadingState label="Loading shipments…" />}
        {shipmentsState === 'error' && (
          <Card><p style={{ fontSize: 13, color: T.danger, margin: 0 }}>Could not load your shipments. <Btn variant="ghost" size="sm" onClick={loadShipments}>Retry</Btn></p></Card>
        )}
        {shipmentsState === 'ready' && shipments.length === 0 && (
          <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No shipments yet — they'll show up here once a customer sends you a request.</p></Card>
        )}
        {shipmentsState === 'ready' && shipments.map(r => (
          <div key={r.id} data-focus-id={r.id}><TransportRequestCard r={r} role="PROVIDER" onChanged={() => { loadShipments(); apiGetMyProvider().then(setData).catch(() => {}); }} /></div>
        ))}

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

    </div>
  );
}
