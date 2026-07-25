import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGetProduct, apiSubmitOffer, apiBookTesting } from '../lib/api';
import { adaptProduct, adaptAgencies, toOfferRequest } from '../lib/adapters';
import { apiGetAgencies } from '../lib/api';
import { PRODUCTS as MOCK, AGENCIES as MOCK_AGENCIES } from '../data';
import { Badge, Btn, Card, Stars, Modal, MetricPill } from '../components/ui';
import T from '../theme';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [p,           setP]           = useState(null);
  const [agencies,    setAgencies]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [offerModal,  setOfferModal]  = useState(false);
  const [testModal,   setTestModal]   = useState(false);
  const [bookAgency,  setBookAgency]  = useState(null);
  const [offerPrice,  setOfferPrice]  = useState('');
  const [offerQty,    setOfferQty]    = useState('');
  const [offerMsg,    setOfferMsg]    = useState('');
  const [offerSent,   setOfferSent]   = useState(false);
  const [booked,      setBooked]      = useState(false);
  const [offerError,  setOfferError]  = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGetProduct(id).then(adaptProduct).catch(() => {
        const mock = MOCK.find(x => String(x.id) === String(id));
        return mock ? adaptProduct(mock) : adaptProduct(MOCK[0]);
      }),
      apiGetAgencies().then(r => adaptAgencies(r || [])).catch(() => adaptAgencies(MOCK_AGENCIES)),
    ]).then(([product, agList]) => {
      setP(product);
      setOfferPrice(String(product.price));
      setOfferQty(String(product.minOrder));
      setAgencies(agList);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleOffer = async () => {
    setOfferError('');
    try {
      await apiSubmitOffer(toOfferRequest({ productId: p._raw?.id || p.id, offeredPrice: offerPrice, quantity: offerQty, message: offerMsg }));
      setOfferSent(true);
    } catch (err) {
      setOfferError(err.message || 'Failed to send offer');
    }
  };

  const handleBookTest = async () => {
    try {
      await apiBookTesting({ agencyId: bookAgency.userId || bookAgency.id, productId: p._raw?.id || p.id, servicesRequested: bookAgency.services });
      setBooked(true);
    } catch {
      setBooked(true); // Show success anyway in demo
    }
  };

  if (loading || !p) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: T.muted }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🌾</div>
      <p>Loading product…</p>
    </div>
  );

  const metrics = [
    { label: 'Moisture',      val: p.metrics.moisture  != null ? `${p.metrics.moisture}%`   : '—', ok: p.metrics.moisture < 14   },
    { label: 'Grain Length',  val: p.metrics.length    != null ? `${p.metrics.length}mm`    : '—', ok: p.metrics.length > 6.5    },
    { label: 'Grain Width',   val: p.metrics.width     != null ? `${p.metrics.width}mm`     : '—', ok: true                       },
    { label: 'Broken %',      val: p.metrics.broken    != null ? `${p.metrics.broken}%`     : '—', ok: p.metrics.broken < 5      },
    { label: 'Purity',        val: p.metrics.purity    != null ? `${p.metrics.purity}%`     : '—', ok: p.metrics.purity > 95     },
    { label: 'Whiteness',     val: p.metrics.whiteness != null ? `${p.metrics.whiteness} WI`: '—', ok: p.metrics.whiteness > 38  },
    { label: 'Chalkiness',    val: p.metrics.chalk     != null ? `${p.metrics.chalk}%`      : '—', ok: p.metrics.chalk < 5       },
    { label: 'Milling Yield', val: p.metrics.milling   != null ? `${p.metrics.milling}%`    : '—', ok: p.metrics.milling > 65    },
  ];

  const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer', color: T.green }}>Home</span>
        {' / '}
        <span onClick={() => navigate('/marketplace')} style={{ cursor: 'pointer', color: T.green }}>Marketplace</span>
        {' / '}{p.name}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 22 }}>
        {/* ── Left column ── */}
        <div>
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ height: 200, background: 'linear-gradient(135deg,#74C69D22,#B7A05A33,#1A3A2A22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🌾</div>
            <div style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <h1 style={{ margin: '0 0 5px', fontSize: 24, fontWeight: 900, color: T.green, letterSpacing: '-0.5px' }}>{p.name}</h1>
                  <div style={{ fontSize: 13, color: T.muted }}>{p.stage} · {p.variety} · 📍 {p.location}</div>
                </div>
                <Badge label={p.badge} type={{ 'Premium':'gold','Export Grade':'blue','Verified':'green','Bulk':'gray','New':'blue' }[p.badge] || 'green'} />
              </div>
              <p style={{ margin: '12px 0 16px', fontSize: 14, color: T.text, lineHeight: 1.65 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {p.certs.length > 0
                  ? p.certs.map(c => <span key={c} style={{ background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>✓ {c}</span>)
                  : <span style={{ color: T.muted, fontSize: 12 }}>No certifications uploaded yet</span>}
              </div>
            </div>
          </Card>

          <Card style={{ marginBottom: 18 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: T.green }}>📊 Quality Metrics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {metrics.map(m => <MetricPill key={m.label} {...m} />)}
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: T.green }}>📋 Listing Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Harvest Date', p.harvest], ['Available Qty', `${p.qty} ${p.unit}`], ['Minimum Order', `${p.minOrder} ${p.unit}`], ['Location', p.location], ['Category', p.cat?.replace(/_/g,' ')], ['Stage', p.stage]].map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', background: T.surface, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginBottom: 2, letterSpacing: 0.3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right sticky ── */}
        <div>
          <Card style={{ marginBottom: 14, position: 'sticky', top: 74 }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: T.gold }}>₨{p.price.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: T.muted }}>per {p.unit} · Min. order {p.minOrder} {p.unit}</div>
              {p.qty < 100 && <div style={{ fontSize: 11, color: T.danger, fontWeight: 700, marginTop: 4 }}>⚠ Limited stock</div>}
            </div>
            <Btn variant="primary" style={{ width: '100%', display: 'block', marginBottom: 9, padding: '11px' }} onClick={() => setOfferModal(true)}>💬 Make an Offer</Btn>
            <Btn variant="secondary" style={{ width: '100%', display: 'block', marginBottom: 9 }} onClick={() => setTestModal(true)}>🧪 Request Lab Test</Btn>
            <Btn variant="ghost" style={{ width: '100%', display: 'block' }} onClick={() => navigate('/transport')}>🚛 Arrange Transport</Btn>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.muted }}>📦 {p.qty} {p.unit} in stock</div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                {(p.seller || 'S')[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{p.seller}</div>
                {p.sellerVerified && <div style={{ fontSize: 11, color: '#15803D', fontWeight: 700 }}>✓ Verified Seller</div>}
              </div>
            </div>
            <Stars rating={p.sellerRating} />
            <span style={{ fontSize: 11, color: T.muted, marginLeft: 6 }}>({p.sellerReviews} reviews)</span>
            <div style={{ fontSize: 12, color: T.muted, margin: '8px 0 12px' }}>📍 {p.location}</div>
            <Btn variant="ghost" style={{ width: '100%', fontSize: 12 }} onClick={() => navigate('/marketplace')}>View All Listings</Btn>
          </Card>
        </div>
      </div>

      {/* ── OFFER MODAL ── */}
      {offerModal && (
        <Modal title="Make an Offer" onClose={() => { setOfferModal(false); setOfferSent(false); setOfferError(''); }}>
          {offerSent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
              <h3 style={{ color: T.green, margin: '0 0 10px' }}>Offer Sent!</h3>
              <p style={{ color: T.muted, fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>The seller will respond within 24 hours. You'll be notified by SMS and email.</p>
              <Btn variant="primary" onClick={() => setOfferModal(false)}>Close</Btn>
            </div>
          ) : (
            <>
              <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{p.name}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Asking: ₨{p.price.toLocaleString()} / {p.unit}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>YOUR PRICE (₨)</label>
                  <input value={offerPrice} onChange={e => setOfferPrice(e.target.value)} type="number" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>QUANTITY ({p.unit})</label>
                  <input value={offerQty} onChange={e => setOfferQty(e.target.value)} type="number" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>MESSAGE TO SELLER</label>
                <textarea value={offerMsg} onChange={e => setOfferMsg(e.target.value)} placeholder="Introduce yourself, mention delivery location…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              {offerPrice && offerQty && (
                <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: T.muted }}>Total Estimated Value</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>₨{(Number(offerPrice) * Number(offerQty)).toLocaleString()}</div>
                </div>
              )}
              {offerError && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {offerError}</div>}
              <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleOffer}>Send Offer →</Btn>
            </>
          )}
        </Modal>
      )}

      {/* ── TESTING MODAL — pick agency ── */}
      {testModal && !bookAgency && (
        <Modal title="Request Lab Testing" onClose={() => setTestModal(false)}>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>Select a certified testing agency to verify this product's quality metrics.</p>
          {agencies.slice(0, 3).map(a => (
            <div key={a.id} onClick={() => setBookAgency(a)} style={{ border: `2px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.green }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>📍{a.city} · ⭐ {a.rating}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.gold }}>₨{a.price.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{a.turnaround}</div>
                </div>
              </div>
            </div>
          ))}
          <Btn variant="secondary" style={{ width: '100%' }} onClick={() => { setTestModal(false); navigate('/testing'); }}>Browse All Agencies →</Btn>
        </Modal>
      )}

      {/* ── TESTING MODAL — confirm ── */}
      {testModal && bookAgency && !booked && (
        <Modal title={`Book: ${bookAgency.name}`} onClose={() => setBookAgency(null)}>
          <div style={{ marginBottom: 14 }}>
            {(bookAgency.services || []).map(s => <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13 }}><input type="checkbox" defaultChecked /> {s}</label>)}
          </div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PREFERRED DATE</label>
          <input type="date" style={{ ...inputStyle, marginBottom: 14 }} />
          <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: T.muted }}>Estimated fee</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.green }}>₨{bookAgency.price.toLocaleString()}</span>
          </div>
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleBookTest}>Confirm & Pay →</Btn>
        </Modal>
      )}

      {testModal && bookAgency && booked && (
        <Modal title="Testing Booked!" onClose={() => { setTestModal(false); setBookAgency(null); setBooked(false); }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🧪</div>
            <h3 style={{ color: '#059669', margin: '0 0 10px' }}>Request Submitted</h3>
            <p style={{ color: T.muted, fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>{bookAgency.name} will contact you to confirm. The report will be attached to this listing once ready.</p>
            <Btn variant="primary" onClick={() => { setTestModal(false); setBookAgency(null); setBooked(false); }}>Done</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
