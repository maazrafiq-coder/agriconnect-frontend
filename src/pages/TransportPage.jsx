import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetTransporters } from '../lib/api';
import { adaptTransporters } from '../lib/adapters';
import CreateTransportRequestFlow from '../components/transport/CreateTransportRequestFlow';
import { Card, Btn, Stars, LoadingState, ErrorState, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import T from '../theme';

import { useApprovalGate } from '../context/ApprovalGate';
// ─── TRANSPORT PAGE ───────────────────────────────────────────────────────────
export function TransportPage() {
  const navigate = useNavigate();
  const { user, openLogin } = useAuth();
  const gate = useApprovalGate();
  const [transporters, setTransporters] = useState([]);
  const [loadState, setLoadState]       = useState('loading'); // loading | ready | error
  const [selected, setSelected]         = useState(null);
  const [from, setFrom]                 = useState('');
  const [to, setTo]                     = useState('');
  const [search, setSearch]             = useState('');

  const load = () => {
    setLoadState('loading');
    apiGetTransporters(search ? { search } : {})
      .then(data => { setTransporters(adaptTransporters(Array.isArray(data) ? data : [])); setLoadState('ready'); })
      .catch(() => {
        setLoadState('error');
      });
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const openBooking = (t) => {
    if (!user) { openLogin(); return; }
    if (!gate.approved) { gate(null, 'request transport')(); return; }
    setSelected(t);
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.green }}>🚛 Transport & Logistics</h1>
        <p style={{ margin: '5px 0 0', color: T.muted, fontSize: 13 }}>Request a quote from a transport provider, accept it, and follow the shipment</p>
        <div style={{ position: 'relative', maxWidth: 340, marginTop: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company name…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Route search */}
      <Card style={{ marginBottom: 28, background: T.green, border: 'none', padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.mint, marginBottom: 14 }}>Describe Your Route <span style={{ fontWeight: 400, opacity: 0.8 }}>(prefills your quote request)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, alignItems: 'flex-end' }}>
          {[['PICKUP CITY', from, setFrom, 'e.g. Sheikhupura, Punjab'], ['DELIVERY CITY', to, setTo, 'e.g. Karachi, Sindh']].map(([label, val, setter, ph]) => (
            <div key={label}>
              <label htmlFor="servicepages-f1" style={{ fontSize: 10, fontWeight: 700, color: T.mint, display: 'block', marginBottom: 5, letterSpacing: 0.5 }}>{label}</label>
              <input id="servicepages-f1" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ ...inputStyle, border: 'none' }} />
            </div>
          ))}
        </div>
      </Card>

      {loadState === 'loading' && <LoadingState label="Loading transporters…" />}
      {loadState === 'error' && <ErrorState message="Could not load transport providers." onRetry={load} />}
      {loadState === 'ready' && transporters.length === 0 && <EmptyState icon="🚛" title="No transporters found" />}
      {loadState === 'ready' && transporters.length > 0 && (
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 8, marginBottom: 12 }}>
                {[['Indicative rate', t.price, T.text], ['Capacity', t.capacity, T.text], ['GPS', t.gps ? '✓ Available' : '✗ N/A', t.gps ? '#15803D' : T.danger], ['Insurance', t.insurance ? '✓ Covered' : '✗ Not covered', t.insurance ? '#15803D' : T.danger]].map(([k, v, vc]) => (
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
              {t.isVerified && <div style={{ fontSize: 11, color: T.tealText, fontWeight: 700, marginBottom: 10 }}>✓ Platform Verified</div>}
              <Btn variant="cyan" style={{ width: '100%' }} onClick={() => openBooking(t)}>Request a Quote →</Btn>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <CreateTransportRequestFlow
          provider={selected}
          initial={{ pickup: from, delivery: to }}
          onClose={() => setSelected(null)}
          onViewRequests={() => { setSelected(null); navigate('/buyer?tab=transport'); }}
        />
      )}
    </div>
  );
}
