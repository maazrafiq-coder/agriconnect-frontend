import { useState, useEffect } from 'react';
import { apiGetAgencies, apiGetMyProducts } from '../lib/api';
import { adaptAgencies, adaptProducts } from '../lib/adapters';
import LabBookingFlow from '../components/testing/LabBookingFlow';
import { Card, Btn, Stars, LoadingState, ErrorState, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import T from '../theme';

import { useApprovalGate } from '../context/ApprovalGate';
// ─── TESTING PAGE ─────────────────────────────────────────────────────────────
export function TestingPage() {
  const { user, openLogin } = useAuth();
  const gate = useApprovalGate();
  const [agencies, setAgencies] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');
  const [myProducts, setMyProducts] = useState([]);
  const [myProductsLoaded, setMyProductsLoaded] = useState(false);

  const load = () => {
    setLoadState('loading');
    apiGetAgencies(search ? { search } : {})
      .then(data => { setAgencies(adaptAgencies(Array.isArray(data) ? data : [])); setLoadState('ready'); })
      .catch(() => {
        setLoadState('error');
      });
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0); // small debounce while typing, instant on first load
    return () => clearTimeout(timer);
  }, [search]);

  // Real listings only — this used to fall back to mock PRODUCTS unconditionally,
  // which meant a real testing booking's "Product to Test" note could end up
  // containing a fabricated product name sent straight to a real agency.
  useEffect(() => {
    if (!user) return;
    apiGetMyProducts()
      .then(data => setMyProducts(adaptProducts(Array.isArray(data) ? data : [])))
      .catch(() => setMyProducts([]))
      .finally(() => setMyProductsLoaded(true));
  }, [user]);

  const openBooking = (a) => {
    if (!user) { openLogin(); return; }
    if (!gate.approved) { gate(null, 'request a lab test')(); return; }
    setSelected(a);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.green }}>🧪 Testing & Inspection Agencies</h1>
        <p style={{ margin: '5px 0 0', color: T.muted, fontSize: 13 }}>Certified laboratories for grain quality analysis, moisture testing, and export certification</p>
        <div style={{ position: 'relative', maxWidth: 340, marginTop: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lab name…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {loadState === 'loading' && <LoadingState label="Loading agencies…" />}
      {loadState === 'error' && <ErrorState message="Could not load testing agencies." onRetry={load} />}
      {loadState === 'ready' && agencies.length === 0 && <EmptyState icon="🧪" title="No testing agencies found" />}
      {loadState === 'ready' && agencies.length > 0 && (
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
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.goldText }}>₨{a.price.toLocaleString()}</div>
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
              <Btn variant="teal" style={{ width: '100%' }} onClick={() => openBooking(a)}>Book Testing →</Btn>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <LabBookingFlow
          agency={selected}
          products={myProducts}
          productsLoaded={myProductsLoaded}
          onClose={() => setSelected(null)}
          onLogin={openLogin}
        />
      )}
    </div>
  );
}
