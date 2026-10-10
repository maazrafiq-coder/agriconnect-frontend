import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetMyProvider, apiRegisterProvider, apiUpdateMyProvider, apiUpdateTracking, apiQuoteTransport, apiDeclineTransportRequest,
  apiGetMyProviderClarifications, apiRespondToClarification,
} from '../lib/api';
import { Card, Btn, Badge, Modal, LoadingState } from '../components/ui';
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
const STATUS_FLOW = ['BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
const STATUS_BADGE = {
  REQUESTED: 'gold', QUOTED: 'gold', BOOKED: 'blue', PICKED_UP: 'blue',
  IN_TRANSIT: 'blue', DELIVERED: 'green', CANCELLED: 'red',
};
const statusLabel = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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

// ─── UPDATE TRACKING MODAL ───────────────────────────────────────────────────
function UpdateTrackingModal({ request, onClose, onUpdated }) {
  const idx = STATUS_FLOW.indexOf(request.status);
  const next = STATUS_FLOW[idx + 1];
  const [currentLocation, setLocation] = useState(request.currentLocation || '');
  const [driverName, setDriverName] = useState(request.driverName || '');
  const [driverPhone, setDriverPhone] = useState(request.driverPhone || '');
  const [eta, setEta] = useState(request.estimatedArrival ? new Date(request.estimatedArrival).toISOString().slice(0, 16) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (advance) => {
    setError('');
    setBusy(true);
    try {
      const data = { currentLocation, driverName, driverPhone };
      if (eta) data.estimatedArrival = new Date(eta).toISOString();
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
        <label htmlFor="transportproviderdashboard-f5" style={labelStyle}>CURRENT LOCATION</label>
        <input id="transportproviderdashboard-f5" style={inputStyle} value={currentLocation} onChange={e => setLocation(e.target.value)} placeholder="e.g. Approaching Gujranwala" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="transportproviderdashboard-f6" style={labelStyle}>ESTIMATED ARRIVAL</label>
        <input id="transportproviderdashboard-f6" type="datetime-local" style={inputStyle} value={eta} onChange={e => setEta(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 16 }}>
        <div>
          <label htmlFor="transportproviderdashboard-f7" style={labelStyle}>DRIVER NAME</label>
          <input id="transportproviderdashboard-f7" style={inputStyle} value={driverName} onChange={e => setDriverName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="transportproviderdashboard-f8" style={labelStyle}>DRIVER PHONE</label>
          <input id="transportproviderdashboard-f8" style={inputStyle} value={driverPhone} onChange={e => setDriverPhone(e.target.value)} />
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

// ─── QUOTE / DECLINE MODAL ───────────────────────────────────────────────────
function QuoteModal({ request, onClose, onDone }) {
  const [price, setPrice] = useState(request.quotedPrice ? String(Number(request.quotedPrice)) : '');
  const [eta, setEta] = useState('');
  const [note, setNote] = useState(request.quoteNote || '');
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setError('');
    if (!(Number(price) > 0)) return setError('Enter a price greater than zero.');
    setBusy(true);
    try {
      await apiQuoteTransport(request.id, { price, estimatedArrival: eta ? new Date(eta).toISOString() : undefined, note });
      onDone();
    } catch (e) { setError(e.message || 'Could not send the quote.'); setBusy(false); }
  };
  const decline = async () => {
    setError('');
    if (reason.trim().length < 5) return setError('Please give a short reason (at least 5 characters).');
    setBusy(true);
    try { await apiDeclineTransportRequest(request.id, reason.trim()); onDone(); }
    catch (e) { setError(e.message || 'Could not decline.'); setBusy(false); }
  };

  return (
    <Modal title={declining ? 'Decline Request' : 'Send a Quote'} onClose={onClose}>
      <p style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>
        {request.pickupCity} → {request.deliveryCity}
        {request.cargoDescription ? ` · ${request.cargoDescription}` : ''}{request.cargoWeightTons ? ` · ${request.cargoWeightTons} t` : ''}
        {request.requiredDate ? ` · needed ${new Date(request.requiredDate).toLocaleDateString('en-PK')}` : ''}
      </p>
      {!declining ? (<>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="transportproviderdashboard-f9" style={labelStyle}>TOTAL PRICE (₨)</label>
          <input id="transportproviderdashboard-f9" type="number" min="1" style={inputStyle} value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="transportproviderdashboard-f10" style={labelStyle}>ESTIMATED ARRIVAL (OPTIONAL)</label>
          <input id="transportproviderdashboard-f10" type="datetime-local" style={inputStyle} value={eta} onChange={e => setEta(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="transportproviderdashboard-f11" style={labelStyle}>NOTE TO CUSTOMER (OPTIONAL)</label>
          <textarea id="transportproviderdashboard-f11" rows={2} style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. includes loading, excludes tolls" />
        </div>
      </>) : (
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="transportproviderdashboard-f12" style={labelStyle}>REASON</label>
          <textarea id="transportproviderdashboard-f12" rows={3} style={inputStyle} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. No vehicle available on those dates" />
        </div>
      )}
      {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" disabled={busy} style={{ flex: 1 }} onClick={() => { setDeclining(d => !d); setError(''); }}>{declining ? 'Back' : 'Decline'}</Btn>
        <Btn variant="primary" disabled={busy} style={{ flex: 1 }} onClick={declining ? decline : send}>{busy ? '…' : declining ? 'Decline request' : 'Send quote'}</Btn>
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
  const [quoteRequest, setQuoteRequest] = useState(null);
  const [editing, setEditing] = useState(false);
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
    return <LoadingState label="Loading your transport dashboard…" />;
  }

  if (notFound || !data) {
    return (
      <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh', padding: '48px 20px' }}>
        <RegisterProviderForm onRegistered={load} />
      </div>
    );
  }

  const { provider, stats, recentRequests } = data;

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
        {recentRequests.length === 0 ? (
          <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No shipments yet — they'll show up here once a customer sends you a request.</p></Card>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {recentRequests.map(r => (
              <Card key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.pickupCity} → {r.deliveryCity}</div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                    {r.requester?.profile?.fullName || 'Requester'} · {r.cargoWeightTons ? `${r.cargoWeightTons} tons` : ''} {r.agreedPrice ? `· Agreed ₨${Number(r.agreedPrice).toLocaleString()}` : r.quotedPrice ? `· Quoted ₨${Number(r.quotedPrice).toLocaleString()}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge label={statusLabel(r.status)} type={STATUS_BADGE[r.status] || 'gray'} />
                  {(r.status === 'REQUESTED' || r.status === 'QUOTED') && (
                    <Btn variant="primary" size="sm" onClick={() => setQuoteRequest(r)}>{r.status === 'QUOTED' ? 'Revise Quote' : 'Send Quote'}</Btn>
                  )}
                  {['BOOKED', 'PICKED_UP', 'IN_TRANSIT'].includes(r.status) && (
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

      {quoteRequest && (
        <QuoteModal request={quoteRequest} onClose={() => setQuoteRequest(null)} onDone={() => { setQuoteRequest(null); load(); }} />
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
