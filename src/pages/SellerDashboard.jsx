import { useState, useEffect } from 'react';
import { apiGetReceivedOffers, apiGetOrders, apiAcceptOffer, apiRejectOffer, apiCounterOffer, apiGetMyProducts } from '../lib/api';
import { adaptOffers, adaptOrders, adaptProducts } from '../lib/adapters';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS } from '../data';
import { Card, Btn, Badge, Tabs, Modal } from '../components/ui';
import { STATUS_COLORS as SC } from '../data';
import T from '../theme';

const MOCK_OFFERS = [
  { id:1, buyer:'Karachi Exports Ltd', product:'1121 Basmati', qty:'100 bags', offered:3600, asking:3800, status:'pending', time:'2h ago' },
  { id:2, buyer:'Dubai Rice Traders', product:'Super Kernel', qty:'50 bags', offered:3400, asking:3500, status:'pending', time:'5h ago' },
  { id:3, buyer:'Punjab Grocers', product:'1121 Basmati', qty:'200 bags', offered:3750, asking:3800, status:'accepted', time:'1d ago' },
];

const MOCK_ORDERS = [
  { id:'ORD-001', buyer:'Karachi Exports Ltd', product:'1121 Basmati', qty:'200 bags', value:'₨750,000', status:'in_transit', date:'15 Jun 2025' },
  { id:'ORD-002', buyer:'Punjab Grocers', product:'Super Kernel', qty:'100 bags', value:'₨350,000', status:'delivered', date:'8 Jun 2025' },
  { id:'ORD-003', buyer:'Lahore Foods Ltd', product:'KS-282', qty:'300 bags', value:'₨870,000', status:'pending', date:'18 Jun 2025' },
];

const MESSAGES = [
  { name:'Karachi Exports Ltd', preview:'Re: rice inquiry', unread:true,
    chat:[
      { who:'them', msg:'Assalam-o-Alaikum, interested in 200 bags of 1121 Basmati. Is it export quality?' },
      { who:'me',   msg:'Walaikum Assalam! Yes, Punjab Food Authority certified. Our best price for 200 bags is ₨3,750/bag.' },
      { who:'them', msg:'Can you share the lab report? Also, what are the delivery terms?' },
      { who:'me',   msg:'Absolutely — report attached above. We offer Ex-Works from Sheikhupura. We can also arrange transport if needed.' },
    ]
  },
  { name:'Dubai Rice Traders', preview:'Super Kernel inquiry', unread:false, chat:[] },
  { name:'Punjab Grocers', preview:'Order confirmed', unread:false, chat:[] },
  { name:'Lahore Foods Ltd', preview:'Delivery schedule', unread:false, chat:[] },
];

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [offerStatuses, setOfferStatuses] = useState({ 1:'pending', 2:'pending', 3:'accepted' });
  const [counterModal, setCounterModal] = useState(null);
  const [activeConvo, setActiveConvo] = useState(0);
  const [msgInput, setMsgInput] = useState('');
  const [chatMessages, setChatMessages] = useState(MESSAGES[0].chat);
  const [OFFERS, setOFFERS] = useState(adaptOffers(MOCK_OFFERS));
  const [ORDERS, setORDERS] = useState(adaptOrders(MOCK_ORDERS));
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    apiGetReceivedOffers()
      .then(data => setOFFERS(adaptOffers(Array.isArray(data) ? data : [])))
      .catch(() => setOFFERS(adaptOffers(MOCK_OFFERS)));

    apiGetOrders('seller')
      .then(data => setORDERS(adaptOrders(Array.isArray(data) ? data : [])))
      .catch(() => setORDERS(adaptOrders(MOCK_ORDERS)));

    apiGetMyProducts()
      .then(data => setMyListings(adaptProducts(Array.isArray(data) ? data : [])))
      .catch(() => {});
  }, []);


  const sendMessage = () => {
    if (!msgInput.trim()) return;
    setChatMessages(prev => [...prev, { who: 'me', msg: msgInput }]);
    setMsgInput('');
  };

  const statsCards = [
    ['📦', 'Active Listings', '4', T.green],
    ['💬', 'Pending Offers', '2', T.warn],
    ['📋', 'Active Orders', '2', T.info],
    ['₨', 'Revenue (30d)', '₨1.1M', T.gold],
    ['👁', 'Profile Views', '234', T.mid],
    ['⭐', 'Avg Rating', '4.8', '#F59E0B'],
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>K</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.green }}>🌾 Seller Portal</h1>
            <p style={{ margin: 0, color: T.muted, fontSize: 12 }}>Khan Rice Mills · ✓ Verified · Sheikhupura, Punjab</p>
          </div>
        </div>
        <Btn variant="gold">+ New Listing</Btn>
      </div>

      <Tabs
        tabs={[['overview','📊 Overview'],['listings','📦 Listings'],['offers','💬 Offers (3)'],['orders','📋 Orders'],['warehouse','🏪 Warehouse'],['messages','✉️ Messages']]}
        active={tab} onChange={setTab} color={T.green}
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
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: T.green }}>Recent Offers</h3>
              {OFFERS.map(o => (
                <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{o.buyer}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{o.product} · {o.qty} · ₨{o.offered}/bag</div>
                  </div>
                  <span style={{ background: SC[offerStatuses[o.id]]?.bg, color: SC[offerStatuses[o.id]]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                    {SC[offerStatuses[o.id]]?.l}
                  </span>
                </div>
              ))}
            </Card>
            <Card>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: T.green }}>Recent Orders</h3>
              {ORDERS.map(o => (
                <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{o.product}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{o.qty} · {o.value}</div>
                    </div>
                    <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                      {SC[o.status]?.l}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* LISTINGS */}
      {tab === 'listings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 14 }}>
          {myListings.map(p => (
            <Card key={p.id} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 90, background: 'linear-gradient(135deg,#74C69D22,#B7A05A22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>
                🌾
                <div style={{ position: 'absolute', top: 8, right: 8 }}><Badge label="Active" type="green" /></div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.green, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>{p.qty} {p.unit} · ₨{p.price.toLocaleString()}/bag</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="secondary" size="sm" onClick={() => navigate(`/product/${p.id}`)}>View</Btn>
                  <Btn variant="ghost" size="sm">Edit</Btn>
                  <Btn variant="ghost" size="sm">Pause</Btn>
                </div>
              </div>
            </Card>
          ))}
          <Card style={{ border: `2px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'pointer' }}>
            <div style={{ textAlign: 'center', color: T.muted }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Add New Listing</div>
            </div>
          </Card>
        </div>
      )}

      {/* OFFERS */}
      {tab === 'offers' && (
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: T.green }}>All Offers Received</h3>
          {OFFERS.map(o => (
            <div key={o.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{o.buyer}</div>
                  <div style={{ fontSize: 12, color: T.muted, margin: '3px 0' }}>
                    {o.product} · {o.qty} · Offered: <strong style={{ color: T.gold }}>₨{o.offered}/bag</strong> vs Asking: ₨{o.asking} · {o.time}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: SC[offerStatuses[o.id]]?.bg, color: SC[offerStatuses[o.id]]?.c, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                    {SC[offerStatuses[o.id]]?.l}
                  </span>
                  {offerStatuses[o.id] === 'pending' && (
                    <>
                      <Btn variant="primary" size="sm" onClick={async () => {
                        try { await apiAcceptOffer(o._raw?.id || o.id); } catch (e) {}
                        setOfferStatuses(s => ({ ...s, [o.id]: 'accepted' }));
                      }}>Accept</Btn>
                      <Btn variant="secondary" size="sm" onClick={() => setCounterModal(o)}>Counter</Btn>
                      <Btn variant="ghost" size="sm" onClick={async () => {
                        try { await apiRejectOffer(o._raw?.id || o.id); } catch (e) {}
                        setOfferStatuses(s => ({ ...s, [o.id]: 'rejected' }));
                      }}>Decline</Btn>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: T.green }}>All Orders</h3>
          {ORDERS.map(o => (
            <div key={o.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: T.green }}>{o.id}</span>
                    <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{SC[o.status]?.l}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{o.buyer}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{o.product} · {o.qty} · Total: <strong>{o.value}</strong> · {o.date}</div>
                </div>
                <Btn variant="ghost" size="sm">View Details</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* MESSAGES */}
      {tab === 'messages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', minHeight: 440 }}>
          <div style={{ borderRight: `1px solid ${T.border}`, background: T.surface }}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 13, color: T.green }}>Conversations</div>
            {MESSAGES.map((m, i) => (
              <div key={m.name} onClick={() => setActiveConvo(i)} style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: activeConvo === i ? '#F0FDF4' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: activeConvo === i ? 700 : 400, fontSize: 13 }}>{m.name}</div>
                  {m.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green }} />}
                </div>
                <div style={{ fontSize: 10, color: T.muted }}>{m.preview}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 13 }}>{MESSAGES[activeConvo].name}</div>
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', minHeight: 300 }}>
              {chatMessages.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: c.who === 'me' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '72%', padding: '9px 13px', borderRadius: 12, background: c.who === 'me' ? T.green : T.surface, color: c.who === 'me' ? '#fff' : T.text, fontSize: 13, lineHeight: 1.5 }}>{c.msg}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '9px 13px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
              <Btn variant="primary" onClick={sendMessage}>Send</Btn>
            </div>
          </div>
        </div>
      )}

      {/* WAREHOUSE TAB */}
      {tab === 'warehouse' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.green }}>🏪 My Stored Inventory</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>View and manage your warehouse receipts and apply for financing</p>
            </div>
            <Btn variant="gold" onClick={() => navigate('/warehouse')}>+ Book Storage</Btn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
            {[['₨10.8M', 'Total Stored Value', T.gold], ['₨4M', 'Under Bank Lien', T.warn], ['2', 'Active Receipts', T.green], ['1', 'Insured Lots', T.teal]].map(([val, label, color]) => (
              <Card key={label} style={{ padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color, marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{label}</div>
              </Card>
            ))}
          </div>
          {[
            { id: 'WR-2025-0041', commodity: '1121 Basmati', qty: '120 tons', warehouse: 'Punjab Cold Chain Hub', value: '₨4,560,000', status: 'active', lien: null },
            { id: 'WR-2025-0039', commodity: 'Wheat', qty: '250 tons', warehouse: 'Gujranwala Grain Silos', value: '₨6,250,000', status: 'lien', lien: 'NBP — ₨4,000,000' },
          ].map(r => (
            <Card key={r.id} style={{ marginBottom: 12, borderLeft: `4px solid ${r.status === 'lien' ? T.warn : T.teal}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: T.green, marginBottom: 4 }}>{r.id}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.commodity} — {r.qty}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>📍 {r.warehouse} · Value: <strong style={{ color: T.gold }}>{r.value}</strong></div>
                  {r.lien && <div style={{ fontSize: 11, color: T.warn, fontWeight: 600, marginTop: 2 }}>🏦 Lien: {r.lien}</div>}
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ background: r.status === 'lien' ? '#FEF3C7' : '#DCFCE7', color: r.status === 'lien' ? T.warn : T.teal, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                    {r.status === 'lien' ? '🏦 Bank Lien' : '✅ Active'}
                  </span>
                  <Btn variant="secondary" size="sm" onClick={() => navigate('/warehouse')}>View DWR</Btn>
                  {!r.lien && <Btn variant="amber" size="sm" onClick={() => navigate('/warehouse')}>Apply for Loan</Btn>}
                </div>
              </div>
            </Card>
          ))}
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: 14, marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#B45309', marginBottom: 4 }}>💡 Tip: Use DWR as Collateral</div>
            <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>Your Digital Warehouse Receipts can be used to get bank loans from NBP, HBL, ZTBL and other partner banks at 6–12% interest — without selling your commodity.</p>
          </div>
        </div>
      )}

      {/* COUNTER OFFER MODAL */}
      {counterModal && (
        <Modal title={`Counter Offer — ${counterModal.buyer}`} onClose={() => setCounterModal(null)}>
          <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: T.muted }}>Their offer: <strong style={{ color: T.gold }}>₨{counterModal.offered}/bag</strong> · Your asking: ₨{counterModal.asking}/bag</div>
          </div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>YOUR COUNTER PRICE (₨/bag)</label>
          <input defaultValue={counterModal.asking - 100} type="number" style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 12, fontWeight: 700 }} />
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>MESSAGE (optional)</label>
          <textarea rows={3} placeholder="Explain your counter offer..." style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 16 }} />
          <Btn variant="primary" style={{ width: '100%' }} onClick={async () => {
            try { await apiCounterOffer(counterModal._raw?.id || counterModal.id, { counterPrice: counterModal.asking - 100 }); } catch (e) {}
            setOfferStatuses(s => ({ ...s, [counterModal.id]: 'accepted' }));
            setCounterModal(null);
          }}>
            Send Counter Offer →
          </Btn>
        </Modal>
      )}
    </div>
  );
}
