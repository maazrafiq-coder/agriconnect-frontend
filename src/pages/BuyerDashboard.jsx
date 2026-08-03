import { useState, useEffect } from 'react';
import { apiGetOrders, apiGetMyTestingRequests, apiGetSavedProducts } from '../lib/api';
import { adaptOrders, adaptProducts, adaptTestingRequests } from '../lib/adapters';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS, STATUS_COLORS as SC } from '../data';
import { Card, Btn, Tabs } from '../components/ui';
import ProductCard from '../components/ProductCard';
import T from '../theme';

const MOCK_ORDERS = [
  { id:'ORD-101', seller:'Khan Rice Mills',       product:'1121 Basmati',  qty:'50 bags',  value:'₨190,000', status:'in_transit', date:'16 Jun', eta:'20 Jun 2025' },
  { id:'ORD-102', seller:'Lahore Agro Exports',   product:'Super Basmati', qty:'30 bags',  value:'₨123,000', status:'confirmed',  date:'12 Jun', eta:'18 Jun 2025' },
  { id:'ORD-103', seller:'Gujranwala Grain Co.',  product:'1509 Basmati',  qty:'80 bags',  value:'₨256,000', status:'delivered',  date:'3 Jun',  eta:'—'           },
];

const MOCK_TESTING = [
  { id:'TST-201', agency:'Punjab Food Authority Lab', product:'1121 Basmati',  status:'completed', report:true,  date:'10 Jun 2025' },
  { id:'TST-202', agency:'PASSCO QC Centre',          product:'Super Basmati', status:'scheduled', report:false, date:'18 Jun 2025' },
];

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [ORDERS, setORDERS] = useState(MOCK_ORDERS);
  const [TESTING, setTESTING] = useState(MOCK_TESTING);
  const [savedProducts, setSavedProducts] = useState([]);

  useEffect(() => {
    apiGetOrders('buyer')
      .then(data => setORDERS(adaptOrders(Array.isArray(data) ? data : [])))
      .catch(() => setORDERS(MOCK_ORDERS));

    apiGetMyTestingRequests('requester')
      .then(data => setTESTING(Array.isArray(data) && data.length ? adaptTestingRequests(data) : MOCK_TESTING))
      .catch(() => setTESTING(MOCK_TESTING));

    apiGetSavedProducts()
      .then(data => setSavedProducts(adaptProducts((data || []).map(s => s.product))))
      .catch(() => {});
  }, []);

  const statsCards = [
    ['📋', 'Active Orders',   '2',      '#2563EB'],
    ['❤️', 'Saved Products', '3',      '#EC4899'],
    ['🧪', 'Lab Reports',    '1',      '#059669'],
    ['🚛', 'Shipments',      '1',      '#0891B2'],
    ['₨',  'Total Spent',    '₨569K',  T.gold   ],
    ['⭐', 'Reviews Given',  '2',      '#F59E0B'],
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>A</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#2563EB' }}>🛒 Buyer Portal</h1>
          <p style={{ margin: 0, color: T.muted, fontSize: 12 }}>Ahmed Exports Pvt. Ltd. · ✓ Verified · Karachi, Sindh</p>
        </div>
      </div>

      <Tabs
        tabs={[['overview','📊 Overview'],['saved','❤️ Saved (3)'],['orders','📋 Orders'],['testing','🧪 Testing'],['transport','🚛 Transport'],['warehouse','🏪 Warehouse']]}
        active={tab} onChange={setTab} color="#2563EB"
      />

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
            {statsCards.map(([icon, label, val, color]) => (
              <Card key={label} style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 6, letterSpacing: 0.3 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: 28, position: 'absolute', opacity: 0.06, right: 12, top: 10 }}>{icon}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: '#2563EB' }}>Recent Orders</h3>
              {ORDERS.map(o => (
                <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{o.product}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{o.id} · {o.qty} · {o.value}</div>
                  </div>
                  <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{SC[o.status]?.l}</span>
                </div>
              ))}
            </Card>

            <Card>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: '#059669' }}>Testing Reports</h3>
              {TESTING.map(t => (
                <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{t.product}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{t.agency}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ background: SC[t.status]?.bg, color: SC[t.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{SC[t.status]?.l}</span>
                    {t.report && <span style={{ fontSize: 11 }}>📄</span>}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* SAVED */}
      {tab === 'saved' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: T.green }}>Saved Products</h3>
            <Btn variant="secondary" size="sm" onClick={() => navigate('/marketplace')}>Browse More →</Btn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
            {(savedProducts.length > 0 ? savedProducts : PRODUCTS.slice(0, 3)).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#2563EB' }}>All Orders</h3>
          {ORDERS.map(o => (
            <div key={o.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: '#2563EB' }}>{o.id}</span>
                    <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{SC[o.status]?.l}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{o.product}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>Seller: {o.seller} · {o.qty} · {o.value} · Ordered: {o.date}</div>
                  {o.eta !== '—' && <div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginTop: 2 }}>ETA: {o.eta}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {o.status === 'in_transit' && <Btn variant="cyan" size="sm">🗺️ Track</Btn>}
                  {o.status === 'delivered'  && <Btn variant="ghost" size="sm">⭐ Rate</Btn>}
                  <Btn variant="ghost" size="sm">Details</Btn>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* TESTING */}
      {tab === 'testing' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#059669' }}>Testing Requests</h3>
            <Btn variant="teal" size="sm" onClick={() => navigate('/testing')}>+ Request Test</Btn>
          </div>
          {TESTING.map(t => (
            <Card key={t.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#059669', marginBottom: 3 }}>{t.id}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.product}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{t.agency} · {t.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: SC[t.status]?.bg, color: SC[t.status]?.c, padding: '3px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{SC[t.status]?.l}</span>
                  {t.report && <Btn variant="secondary" size="sm">📄 Download Report</Btn>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TRANSPORT */}
      {tab === 'transport' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0891B2' }}>Transport Bookings</h3>
            <Btn variant="cyan" size="sm" onClick={() => navigate('/transport')}>+ Book Transport</Btn>
          </div>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#0891B2', marginBottom: 3 }}>TRK-301</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Pak Logistics Express</div>
                <div style={{ fontSize: 12, color: T.muted }}>Sheikhupura → Karachi · 20-ton Truck · Booked 14 Jun 2025</div>
                <div style={{ fontSize: 11, color: '#4338CA', fontWeight: 600, marginTop: 3 }}>📍 Currently near Multan · ETA: 20 Jun</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ background: '#E0E7FF', color: '#4338CA', padding: '3px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>In Transit</span>
                <Btn variant="cyan" size="sm">🗺️ Track Live</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* WAREHOUSE TAB */}
      {tab === 'warehouse' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#B45309' }}>🏪 Warehoused Purchases</h3>
            <Btn variant="gold" size="sm" onClick={() => navigate('/warehouse')}>Browse Warehouses →</Btn>
          </div>
          <Card style={{ marginBottom: 12, borderLeft: '4px solid #059669' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#059669', marginBottom: 3 }}>WR-2025-0041</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>1121 Basmati — 120 tons</div>
                <div style={{ fontSize: 12, color: T.muted }}>📍 Punjab Cold Chain Hub, Sheikhupura · Entry: 10 May 2025</div>
                <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>🛡️ Insured by Jubilee Insurance · Value: ₨4,560,000</div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <Btn variant="secondary" size="sm" onClick={() => navigate('/warehouse')}>View Receipt</Btn>
                <Btn variant="ghost" size="sm">📄 Download</Btn>
              </div>
            </div>
          </Card>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8', marginBottom: 4 }}>📋 About Warehouse Receipts</div>
            <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>Commodities you purchase and choose to store in partner warehouses are secured under Digital Warehouse Receipts (DWR). These serve as proof of ownership and can be used to secure financing or transfer ownership without physical movement.</p>
          </div>
        </div>
      )}
    </div>
  );
}
