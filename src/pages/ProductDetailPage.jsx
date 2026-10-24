import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGetProduct, apiToggleSaveProduct, apiGetSavedProducts } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LabBookingFlow from '../components/testing/LabBookingFlow';
import MakeOfferFlow from '../components/offers/MakeOfferFlow';
import { adaptProduct, adaptAgencies } from '../lib/adapters';
import { apiGetAgencies } from '../lib/api';
import { Badge, Btn, Card, Stars, Modal, MetricPill, ErrorState, LoadingState } from '../components/ui';
import T from '../theme';
import { clickable } from '../lib/a11y';

import { useApprovalGate } from '../context/ApprovalGate';
export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, openLogin } = useAuth();
  const gate = useApprovalGate();
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [p,           setP]           = useState(null);
  const [agencies,    setAgencies]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [offerModal,  setOfferModal]  = useState(false);
  const [testModal,   setTestModal]   = useState(false);
  const [bookAgency,  setBookAgency]  = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      apiGetProduct(id).then(adaptProduct),
      apiGetAgencies().then(r => adaptAgencies(r || [])).catch(() => []),
    ]).then(([product, agList]) => {
      setP(product);
      setAgencies(agList);
    }).catch(err => {
      // A real "product not found or API failed" must surface as such —
      // silently substituting an unrelated mock product would show the
      // wrong listing (wrong price, wrong seller) without any indication.
        setP(null);
        setLoadError(err?.message || 'This product could not be loaded.');
    }).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  // Is this listing already in the user's Saved list?
  useEffect(() => {
    setSaved(false);
    if (!user) return;
    apiGetSavedProducts()
      .then(list => setSaved((list || []).some(s => (s.productId || s.product?.id) === id)))
      .catch(() => {});
  }, [id, user]);

  const toggleSave = async () => {
    if (!user) { navigate('/'); return; }
    setSaving(true); setSaveMsg('');
    try {
      const res = await apiToggleSaveProduct(p._raw?.id || p.id);
      setSaved(!!res?.saved);
    } catch (e) { setSaveMsg(e?.message || 'Could not update saved items'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
      <LoadingState label="Loading product…" />
    </div>
  );

  if (loadError || !p) return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px' }}>
      <ErrorState message={loadError || 'This product could not be found.'} onRetry={load} />
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


  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
        <span {...clickable(() => navigate('/'))} style={{ cursor: 'pointer', color: T.green }}>Home</span>
        {' / '}
        <span {...clickable(() => navigate('/marketplace'))} style={{ cursor: 'pointer', color: T.green }}>Marketplace</span>
        {' / '}{p.name}
      </div>

      <div className="ac-split-aside" style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 22 }}>
        {/* ── Left column ── */}
        <div>
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ height: 200, background: p.images?.[activeImage] ? `url(${p.images[activeImage]}) center/cover no-repeat` : 'linear-gradient(135deg,#74C69D22,#B7A05A33,#1A3A2A22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>
              {!p.images?.length && '🌾'}
            </div>
            {p.images?.length > 1 && (
              <div style={{ display: 'flex', gap: 6, padding: '10px 24px 0' }}>
                {p.images.map((url, i) => (
                  <button
                    type="button"
                    key={url}
                    aria-label={`Show image ${i + 1} of ${p.images.length}`}
                    aria-pressed={i === activeImage}
                    onClick={() => setActiveImage(i)}
                    style={{
                      padding: 0, width: 52, height: 52, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                      background: `url(${url}) center/cover no-repeat`,
                      border: `2px solid ${i === activeImage ? T.gold : 'transparent'}`,
                    }}
                  />
                ))}
              </div>
            )}
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
            <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: T.green }}>📊 Quality Metrics</h2>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: T.muted }}>Declared by the seller. Book a lab test for independent verification.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {metrics.map(m => <MetricPill key={m.label} {...m} />)}
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: T.green }}>📋 Listing Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
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
              <div style={{ fontSize: 30, fontWeight: 900, color: T.goldText }}>₨{p.price.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: T.muted }}>per {p.unit} · Min. order {p.minOrder} {p.unit}</div>
              {p.qty < 100 && <div style={{ fontSize: 11, color: T.danger, fontWeight: 700, marginTop: 4 }}>⚠ Limited stock</div>}
            </div>
            <Btn variant="primary" style={{ width: '100%', display: 'block', marginBottom: 9, padding: '11px' }} onClick={gate(() => setOfferModal(true), 'make an offer')}>💬 Make an Offer</Btn>
            <Btn variant="secondary" style={{ width: '100%', display: 'block', marginBottom: 9 }} onClick={gate(() => setTestModal(true), 'request a lab test')}>🧪 Request Lab Test</Btn>
            <Btn variant="ghost" style={{ width: '100%', display: 'block', marginBottom: 9 }} onClick={() => navigate('/transport')}>🚛 Arrange Transport</Btn>
            {p.sellerId !== user?.id && (
              <Btn variant="ghost" style={{ width: '100%', display: 'block' }} disabled={saving} onClick={toggleSave}>
                {saved ? '❤️ Saved — tap to remove' : '🤍 Save for later'}
              </Btn>
            )}
            {saveMsg && <div style={{ fontSize: 11, color: T.danger, marginTop: 6 }}>{saveMsg}</div>}
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
            <Btn variant="ghost" style={{ width: '100%', fontSize: 12 }} onClick={() => navigate(`/seller/${p.sellerId}`)}>View Seller Profile</Btn>
          </Card>
        </div>
      </div>

      {/* ── OFFER FLOW (form → review incl. payment terms → success) ── */}
      {offerModal && <MakeOfferFlow product={p} onClose={() => setOfferModal(false)} />}

      {/* ── TESTING MODAL — pick agency ── */}
      {testModal && !bookAgency && (
        <Modal title="Request Lab Testing" onClose={() => setTestModal(false)}>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>Select a certified testing agency to verify this product's quality metrics.</p>
          {agencies.slice(0, 3).map(a => (
            <div key={a.id} {...clickable(() => setBookAgency(a))} style={{ border: `2px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.green }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>📍{a.city} · ⭐ {a.rating}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.goldText }}>₨{a.price.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{a.turnaround}</div>
                </div>
              </div>
            </div>
          ))}
          <Btn variant="secondary" style={{ width: '100%' }} onClick={() => { setTestModal(false); navigate('/testing'); }}>Browse All Agencies →</Btn>
        </Modal>
      )}

      {/* ── TESTING — details → review → confirmation (no payment is taken) ── */}
      {testModal && bookAgency && (
        <LabBookingFlow
          agency={bookAgency}
          product={{ id: p._raw?.id || p.id, name: p.name }}
          onClose={() => { setTestModal(false); setBookAgency(null); }}
          onLogin={openLogin}
        />
      )}
    </div>
  );
}
