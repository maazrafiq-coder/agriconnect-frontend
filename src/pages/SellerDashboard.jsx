import { useState, useEffect } from 'react';
import { apiGetReceivedOffers, apiGetOrders, apiAcceptOffer, apiRejectOffer, apiCounterOffer, apiGetMyProducts, apiCreateProduct, apiChangeProductStatus, apiGetCategories, apiGetCities, apiGetUnits } from '../lib/api';
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
  const [declineModal, setDeclineModal] = useState(null);
  const [counterModal, setCounterModal] = useState(null);
  const [newListingModal, setNewListingModal] = useState(false);
  const [activeConvo, setActiveConvo] = useState(0);
  const [msgInput, setMsgInput] = useState('');
  const [chatMessages, setChatMessages] = useState(MESSAGES[0].chat);
  const [OFFERS, setOFFERS] = useState(MOCK_OFFERS);
  const [ORDERS, setORDERS] = useState(MOCK_ORDERS);
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    apiGetReceivedOffers()
      .then(data => setOFFERS(adaptOffers(Array.isArray(data) ? data : [])))
      .catch(() => setOFFERS(MOCK_OFFERS));

    apiGetOrders('seller')
      .then(data => setORDERS(adaptOrders(Array.isArray(data) ? data : [])))
      .catch(() => setORDERS(MOCK_ORDERS));

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
        <Btn variant="gold" onClick={() => setNewListingModal(true)}>+ New Listing</Btn>
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
                  <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                    {SC[o.status]?.l}
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
                  <Btn variant="ghost" size="sm" onClick={() => setNewListingModal(true)}>Edit</Btn>
                  <Btn variant="ghost" size="sm" onClick={async () => {
                    try {
                      await apiChangeProductStatus(p._raw?.id || p.id, p.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED');
                      setMyListings(prev => prev.map(x => x.id === p.id ? { ...x, status: x.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED' } : x));
                    } catch (e) { /* keep UI responsive even if API unavailable in demo */ }
                  }}>{p.status === 'PAUSED' ? 'Resume' : 'Pause'}</Btn>
                </div>
              </div>
            </Card>
          ))}
          <Card
            onClick={() => setNewListingModal(true)}
            style={{ border: `2px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'pointer' }}
          >
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
          {OFFERS.length === 0 && <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '20px 0' }}>No offers yet.</p>}
          {OFFERS.map(o => (
            <div key={o.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{o.buyer}</div>
                  <div style={{ fontSize: 12, color: T.muted, margin: '3px 0' }}>
                    {o.product} · {o.qty} · Offered: <strong style={{ color: T.gold }}>₨{o.offered}/bag</strong> vs Asking: ₨{o.asking} · {o.time}
                  </div>
                  {o.message && <div style={{ fontSize: 12, color: T.text, fontStyle: 'italic', marginTop: 4 }}>"{o.message}"</div>}
                  {o.status === 'rejected' && o._raw?.rejectionReason && (
                    <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>Declined: {o._raw.rejectionReason}</div>
                  )}
                  {o.status === 'countered' && o.counter && (
                    <div style={{ fontSize: 11, color: T.warn, marginTop: 4 }}>Your counter: ₨{o.counter}/bag</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                    {SC[o.status]?.l}
                  </span>
                  {o.status === 'pending' && (
                    <>
                      <Btn variant="primary" size="sm" onClick={async () => {
                        try {
                          await apiAcceptOffer(o._raw?.id || o.id);
                          setOFFERS(prev => prev.map(x => x.id === o.id ? { ...x, status: 'accepted' } : x));
                        } catch (err) {
                          alert(err.message || 'Failed to accept offer');
                        }
                      }}>Accept</Btn>
                      <Btn variant="secondary" size="sm" onClick={() => setCounterModal(o)}>Counter</Btn>
                      <Btn variant="ghost" size="sm" onClick={() => setDeclineModal(o)}>Decline</Btn>
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
      {counterModal && <CounterOfferModal offer={counterModal} onClose={() => setCounterModal(null)} onSent={(updated) => {
        setOFFERS(prev => prev.map(x => x.id === counterModal.id ? { ...x, status: 'countered', counter: updated.counterPrice } : x));
        setCounterModal(null);
      }} />}

      {declineModal && <DeclineOfferModal offer={declineModal} onClose={() => setDeclineModal(null)} onDeclined={(reason) => {
        setOFFERS(prev => prev.map(x => x.id === declineModal.id ? { ...x, status: 'rejected', _raw: { ...x._raw, rejectionReason: reason } } : x));
        setDeclineModal(null);
      }} />}

      {newListingModal && (
        <NewListingModal
          onClose={() => setNewListingModal(false)}
          onCreated={(created) => {
            setMyListings(prev => [adaptProducts([created])[0], ...prev]);
            setNewListingModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── COUNTER OFFER MODAL ────────────────────────────────────────────────────────
function CounterOfferModal({ offer, onClose, onSent }) {
  const [counterPrice, setCounterPrice] = useState(String(offer.asking - 100));
  const [counterMessage, setCounterMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!counterPrice || Number(counterPrice) <= 0) {
      setError('Enter a valid counter price');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await apiCounterOffer(offer._raw?.id || offer.id, {
        counterPrice: Number(counterPrice),
        counterMessage: counterMessage || undefined,
      });
      onSent({ counterPrice: Number(counterPrice) });
    } catch (err) {
      setError(err.message || 'Failed to send counter offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Counter Offer — ${offer.buyer}`} onClose={onClose}>
      <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: T.muted }}>Their offer: <strong style={{ color: T.gold }}>₨{offer.offered}/bag</strong> · Your asking: ₨{offer.asking}/bag</div>
      </div>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>YOUR COUNTER PRICE (₨/bag)</label>
      <input value={counterPrice} onChange={e => setCounterPrice(e.target.value)} type="number" style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 12, fontWeight: 700 }} />
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>MESSAGE (optional)</label>
      <textarea value={counterMessage} onChange={e => setCounterMessage(e.target.value)} rows={3} placeholder="Explain your counter offer..." style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 16 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSend} disabled={loading}>
        {loading ? 'Sending…' : 'Send Counter Offer →'}
      </Btn>
    </Modal>
  );
}

// ─── DECLINE OFFER MODAL (with required reason) ───────────────────────────────
function DeclineOfferModal({ offer, onClose, onDeclined }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const QUICK_REASONS = ['Price too low', 'Insufficient quantity available', 'Already sold to another buyer', 'Quality requirements not met'];

  const handleDecline = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason — the buyer will see this');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiRejectOffer(offer._raw?.id || offer.id, reason);
      onDeclined(reason);
    } catch (err) {
      setError(err.message || 'Failed to decline offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Decline Offer — ${offer.buyer}`} onClose={onClose}>
      <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: T.muted }}>{offer.product} · {offer.qty} · Offered: <strong style={{ color: T.gold }}>₨{offer.offered}/bag</strong></div>
      </div>
      <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {QUICK_REASONS.map(r => (
          <button key={r} onClick={() => setReason(r)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 14, border: `1.5px solid ${reason === r ? T.danger : T.border}`, background: reason === r ? '#FEE2E2' : T.white, color: reason === r ? T.danger : T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{r}</button>
        ))}
      </div>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>REASON (visible to buyer) *</label>
      <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Let the buyer know why you're declining..." style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="danger" style={{ width: '100%' }} onClick={handleDecline} disabled={loading}>
        {loading ? 'Declining…' : 'Confirm Decline →'}
      </Btn>
    </Modal>
  );
}

// ─── NEW LISTING MODAL ─────────────────────────────────────────────────────────
const RICE_STAGES = ['PADDY', 'BROWN_RICE', 'MILLED_WHITE', 'WHITE_RICE', 'PARBOILED'];

function NewListingModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    category: 'rice', name: '', description: '', quantity: '', unit: '40kg bags',
    askingPrice: '', minOrderQty: '', locationCity: '', locationProvince: 'Punjab',
    harvestDate: '', packagingType: '', deliveryTerms: '',
    // Rice-specific (optional, only sent if category is RICE)
    stage: 'MILLED_WHITE', variety: '', moisturePct: '', grainLengthMm: '', brokenPct: '', purityPct: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([
    { slug: 'rice', name: 'Rice', icon: '🌾' }, { slug: 'paddy', name: 'Paddy', icon: '🌾' },
    { slug: 'wheat', name: 'Wheat', icon: '🌿' }, { slug: 'maize', name: 'Maize', icon: '🌽' },
    { slug: 'pulses', name: 'Pulses', icon: '🫘' }, { slug: 'oil-seeds', name: 'Oil Seeds', icon: '🛢️' },
  ]); // instant fallback; replaced once the real admin-managed list loads
  const [cities, setCities] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    apiGetCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    apiGetCities().then(setCities).catch(() => setCities([]));
  }, []);

  // Units depend on which category is currently selected — re-fetch whenever
  // it changes so e.g. picking "Cotton" surfaces "Bales" in the dropdown.
  useEffect(() => {
    apiGetUnits(form.category).then(list => {
      setUnits(list);
      // If the previously-selected unit isn't valid for the new category, clear it
      if (form.unit && !list.some(u => u.name === form.unit)) {
        set('unit', '');
      }
    }).catch(() => setUnits([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };

  const handleSubmit = async () => {
    if (!form.name || !form.quantity || !form.askingPrice || !form.minOrderQty || !form.locationCity) {
      setError('Please fill in all required fields: name, quantity, price, min. order, and location');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        category: form.category,
        name: form.name,
        description: form.description || undefined,
        quantity: Number(form.quantity),
        unit: form.unit,
        askingPrice: Number(form.askingPrice),
        minOrderQty: Number(form.minOrderQty),
        locationCity: form.locationCity,
        locationProvince: form.locationProvince,
        harvestDate: form.harvestDate || undefined,
        packagingType: form.packagingType || undefined,
        deliveryTerms: form.deliveryTerms || undefined,
        ...(form.category === 'rice' && form.variety ? {
          riceDetails: {
            stage: form.stage,
            variety: form.variety,
            moisturePct: form.moisturePct ? Number(form.moisturePct) : undefined,
            grainLengthMm: form.grainLengthMm ? Number(form.grainLengthMm) : undefined,
            brokenPct: form.brokenPct ? Number(form.brokenPct) : undefined,
            purityPct: form.purityPct ? Number(form.purityPct) : undefined,
          },
        } : {}),
      };
      const created = await apiCreateProduct(payload);
      onCreated(created);
    } catch (err) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New Listing" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PRODUCT NAME *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. 1121 Basmati — Milled White" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>DESCRIPTION</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Describe quality, certifications, export suitability..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>QUANTITY *</label>
          <input value={form.quantity} onChange={e => set('quantity', e.target.value)} type="number" placeholder="500" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>UNIT</label>
          <select value={form.unit} onChange={e => set('unit', e.target.value)} style={inputStyle}>
            <option value="">— Select unit —</option>
            {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>MIN. ORDER *</label>
          <input value={form.minOrderQty} onChange={e => set('minOrderQty', e.target.value)} type="number" placeholder="50" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>ASKING PRICE (₨) *</label>
        <input value={form.askingPrice} onChange={e => set('askingPrice', e.target.value)} type="number" placeholder="3800" style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CITY *</label>
          <select value={form.locationCity} onChange={e => set('locationCity', e.target.value)} style={inputStyle}>
            <option value="">— Select city —</option>
            {cities.filter(c => c.province === form.locationProvince).map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PROVINCE</label>
          <select value={form.locationProvince} onChange={e => { set('locationProvince', e.target.value); set('locationCity', ''); }} style={inputStyle}>
            {['Punjab', 'Sindh', 'KPK', 'Balochistan'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>HARVEST DATE</label>
          <input value={form.harvestDate} onChange={e => set('harvestDate', e.target.value)} type="date" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PACKAGING TYPE</label>
          <input value={form.packagingType} onChange={e => set('packagingType', e.target.value)} placeholder="Woven PP Bags" style={inputStyle} />
        </div>
      </div>

      {form.category === 'rice' && (
        <div style={{ background: T.surface, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 10 }}>🌾 Rice Quality Details (optional but recommended)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>MILLING STAGE</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} style={inputStyle}>
                {RICE_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>VARIETY</label>
              <input value={form.variety} onChange={e => set('variety', e.target.value)} placeholder="1121 Basmati" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {[['Moisture %', 'moisturePct'], ['Grain Length (mm)', 'grainLengthMm'], ['Broken %', 'brokenPct'], ['Purity %', 'purityPct']].map(([label, key]) => (
              <div key={key}>
                <label style={{ ...labelStyle, fontSize: 10 }}>{label}</label>
                <input value={form[key]} onChange={e => set(key, e.target.value)} type="number" step="0.1" style={{ ...inputStyle, padding: '7px 9px' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 14, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}

      <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Creating…' : 'Create Listing →'}
      </Btn>
    </Modal>
  );
}
