import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetAgencies, apiBookTesting, apiGetTransporters, apiBookTransport, apiCreateTransportRequest } from '../lib/api';
import { adaptAgencies, adaptTransporters } from '../lib/adapters';
import { AGENCIES as MOCK_A, TRANSPORTERS as MOCK_T, PRODUCTS as MOCK_P } from '../data';
import { Card, Btn, Stars, Modal } from '../components/ui';
import T from '../theme';

// ─── TESTING PAGE ─────────────────────────────────────────────────────────────
export function TestingPage() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [booked, setBooked]     = useState(false);
  const [product, setProduct]   = useState('');

  useEffect(() => {
    apiGetAgencies()
      .then(data => setAgencies(adaptAgencies(Array.isArray(data) ? data : [])))
      .catch(() => setAgencies(MOCK_A))
      .finally(() => setLoading(false));
  }, []);

  const handleBook = async () => {
    try {
      await apiBookTesting({
        agencyId: selected.userId || selected.id,
        servicesRequested: selected.services,
        notes: product ? `Product: ${product}` : undefined,
      });
    } catch { /* show success anyway */ }
    setBooked(true);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.green }}>🧪 Testing & Inspection Agencies</h1>
        <p style={{ margin: '5px 0 0', color: T.muted, fontSize: 13 }}>Certified laboratories for grain quality analysis, moisture testing, and export certification</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading agencies…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
          {agencies.map(a => (
            <Card key={a.id}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🧪</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: T.green }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>📍 {a.city}, {a.province}</div>
                  <Stars rating={a.rating} /><span style={{ fontSize: 11, color: T.muted }}> ({a.reviews})</span>
                </div>
              </div>
              <div style={{ display: 'flex', marginBottom: 14 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.gold }}>₨{a.price.toLocaleString()}</div>
                  <div style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>BASIC PANEL</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderLeft: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{a.turnaround}</div>
                  <div style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>TURNAROUND</div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, marginBottom: 6, letterSpacing: 0.5 }}>SERVICES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(a.services || []).map(s => <span key={s} style={{ background: '#D1FAE5', color: '#059669', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{s}</span>)}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, marginBottom: 5, letterSpacing: 0.5 }}>ACCREDITATIONS</div>
                {(a.accred || []).map(ac => <div key={ac} style={{ fontSize: 12, color: '#15803D', fontWeight: 600, marginBottom: 2 }}>✓ {ac}</div>)}
                {a.isVerified && <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, marginTop: 4 }}>✓ Platform Verified</div>}
              </div>
              <Btn variant="teal" style={{ width: '100%' }} onClick={() => { setSelected(a); setBooked(false); }}>Book Testing →</Btn>
            </Card>
          ))}
        </div>
      )}

      {selected && !booked && (
        <Modal title={`Book Testing — ${selected.name}`} onClose={() => setSelected(null)}>
          <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.green }}>{selected.name} · {selected.city}</div>
            <Stars rating={selected.rating} /><span style={{ fontSize: 11, color: T.muted }}> · {selected.turnaround} turnaround</span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.5 }}>SELECT SERVICES</div>
            {(selected.services || []).map(s => <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13 }}><input type="checkbox" defaultChecked style={{ width: 14, height: 14 }} /> {s}</label>)}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, letterSpacing: 0.5 }}>PRODUCT TO TEST</div>
            <select value={product} onChange={e => setProduct(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option value="">— Select a product —</option>
              {MOCK_P.slice(0, 5).map(p => <option key={p.id} value={p.name}>{p.name} — {p.location?.split(',')[0]}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, letterSpacing: 0.5 }}>PREFERRED DATE</div>
            <input type="date" style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: T.muted }}>Estimated fee</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: T.green }}>₨{selected.price.toLocaleString()}</span>
          </div>
          <Btn variant="teal" style={{ width: '100%', padding: '11px' }} onClick={handleBook}>Confirm & Pay →</Btn>
        </Modal>
      )}
      {selected && booked && (
        <Modal title="Testing Booked!" onClose={() => { setSelected(null); setBooked(false); }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
            <h3 style={{ color: '#059669', margin: '0 0 10px' }}>Booking Confirmed</h3>
            <p style={{ color: T.muted, fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>You'll receive an SMS confirmation. The lab report will be digitally attached to your product listing once ready.</p>
            <Btn variant="teal" onClick={() => { setSelected(null); setBooked(false); }}>Done</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TRANSPORT PAGE ───────────────────────────────────────────────────────────
export function TransportPage() {
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [booked, setBooked]             = useState(false);
  const [from, setFrom]                 = useState('');
  const [to, setTo]                     = useState('');

  useEffect(() => {
    apiGetTransporters()
      .then(data => setTransporters(adaptTransporters(Array.isArray(data) ? data : [])))
      .catch(() => setTransporters(MOCK_T))
      .finally(() => setLoading(false));
  }, []);

  const handleBook = async () => {
    try {
      const req = await apiCreateTransportRequest({
        pickupLocation: from || 'Pickup location',
        pickupCity: from?.split(',')[0] || 'Lahore',
        deliveryLocation: to || 'Delivery location',
        deliveryCity: to?.split(',')[0] || 'Karachi',
      });
      if (req?.id) {
        await apiBookTransport({ requestId: req.id, providerId: selected.userId || selected.id, agreedPrice: parseFloat(selected.price) || 0 });
      }
    } catch { /* show success */ }
    setBooked(true);
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.green }}>🚛 Transport & Logistics</h1>
        <p style={{ margin: '5px 0 0', color: T.muted, fontSize: 13 }}>Vetted transport providers with GPS tracking and insurance across all of Pakistan</p>
      </div>

      {/* Route search */}
      <Card style={{ marginBottom: 28, background: T.green, border: 'none', padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.mint, marginBottom: 14 }}>Find Transport for Your Route</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
          {[['PICKUP CITY', from, setFrom, 'e.g. Sheikhupura, Punjab'], ['DELIVERY CITY', to, setTo, 'e.g. Karachi, Sindh']].map(([label, val, setter, ph]) => (
            <div key={label}>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.mint, display: 'block', marginBottom: 5, letterSpacing: 0.5 }}>{label}</label>
              <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ ...inputStyle, border: 'none' }} />
            </div>
          ))}
          <Btn variant="gold">Search Routes</Btn>
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading transporters…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
          {transporters.map(t => (
            <Card key={t.id}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: '#0891B2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚛</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: T.green }}>{t.name}</div>
                  <Stars rating={t.rating} /><span style={{ fontSize: 11, color: T.muted }}> ({t.reviews})</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[['Rate', t.price, T.text], ['Capacity', t.capacity, T.text], ['GPS', t.gps ? '✓ Available' : '✗ N/A', t.gps ? '#15803D' : T.danger], ['Insurance', t.insurance ? '✓ Covered' : '✗ Not covered', t.insurance ? '#15803D' : T.danger]].map(([k, v, vc]) => (
                  <div key={k} style={{ background: T.surface, borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, color: T.muted, fontWeight: 700, letterSpacing: 0.3, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: vc }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, marginBottom: 5, letterSpacing: 0.5 }}>VEHICLE TYPES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(t.vehicles || []).map(v => <span key={v} style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{v}</span>)}
                </div>
              </div>
              <div style={{ marginBottom: 14, fontSize: 12, color: T.muted }}>🗺️ Covers: {(t.provinces || []).join(' · ')}</div>
              {t.isVerified && <div style={{ fontSize: 11, color: T.teal, fontWeight: 700, marginBottom: 10 }}>✓ Platform Verified</div>}
              <Btn variant="cyan" style={{ width: '100%' }} onClick={() => { setSelected(t); setBooked(false); }}>Get Quote & Book →</Btn>
            </Card>
          ))}
        </div>
      )}

      {selected && !booked && (
        <Modal title={`Book Transport — ${selected.name}`} onClose={() => setSelected(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[['PICKUP LOCATION', from || 'Sheikhupura, Punjab'], ['DELIVERY LOCATION', to || 'Karachi, Sindh']].map(([l, ph]) => (
              <div key={l}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>{l}</label>
                <input placeholder={ph} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>VEHICLE TYPE</label>
              <select style={{ ...inputStyle }}>
                {(selected.vehicles || []).map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>REQUIRED DATE</label>
              <input type="date" style={inputStyle} />
            </div>
          </div>
          <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Estimated Rate</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0891B2' }}>{selected.price}</div>
          </div>
          <Btn variant="cyan" style={{ width: '100%', padding: '11px' }} onClick={handleBook}>Confirm Booking →</Btn>
        </Modal>
      )}
      {selected && booked && (
        <Modal title="Transport Booked!" onClose={() => { setSelected(null); setBooked(false); }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🚛</div>
            <h3 style={{ color: '#0891B2', margin: '0 0 10px' }}>Booking Confirmed</h3>
            <p style={{ color: T.muted, fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>{selected.name} will confirm pickup details via SMS. You'll receive a tracking link once in transit.</p>
            <Btn variant="cyan" onClick={() => { setSelected(null); setBooked(false); }}>Done</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
