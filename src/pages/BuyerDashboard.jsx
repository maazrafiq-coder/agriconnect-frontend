import { useState, useEffect } from 'react';
import { apiGetOrders, apiGetMyTestingRequests, apiGetMyTransportRequests, apiGetTestingReportFile, apiGetSavedProducts, apiGetSentOffers, apiAcceptCounter, apiWithdrawOffer } from '../lib/api';
import { adaptOrders, adaptProducts, adaptTestingRequests, adaptTransportRequests } from '../lib/adapters';
import TransportRequestCard from '../components/TransportRequestCard';
import { useNavigate } from 'react-router-dom';
import { STATUS_COLORS as SC } from '../data';
import { Card, Btn, Tabs, LoadingState, ErrorState, EmptyState } from '../components/ui';
import ProductCard from '../components/ProductCard';
import OfferThread from '../components/OfferThread';
import OrderActions from '../components/OrderActions';
import PortalWarehouseTab from '../components/PortalWarehouseTab';
import usePortalProfile from '../lib/usePortalProfile';
import T from '../theme';
import { clickable } from '../lib/a11y';

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [ORDERS, setORDERS] = useState([]);
  const [ordersState, setOrdersState] = useState('loading'); // loading | ready | error
  const [TESTING, setTESTING] = useState([]);
  const [testingState, setTestingState] = useState('loading');
  const [TRANSPORT, setTRANSPORT] = useState([]);
  const [transportState, setTransportState] = useState('loading');
  const [reportError, setReportError] = useState('');
  const [savedProducts, setSavedProducts] = useState([]);
  const portal = usePortalProfile();
  const [openOrder, setOpenOrder] = useState(null);
  const [sentOffers, setSentOffers] = useState([]);
  const [activeOffer, setActiveOffer] = useState(null);
  const [offerBusy, setOfferBusy] = useState(null);
  const [offerError, setOfferError] = useState('');

  const loadOffers = () =>
    apiGetSentOffers().then(d => setSentOffers(Array.isArray(d) ? d : [])).catch(() => setSentOffers([]));

  const acceptCounter = async (o) => {
    const total = Number(o.counterPrice) * Number(o.quantity);
    if (!window.confirm(`Accept the seller's counter of ₨${Number(o.counterPrice).toLocaleString()} per ${o.product?.unit || 'unit'}?\n\nThis creates an order for ${o.quantity} ${o.product?.unit || ''} — total ₨${total.toLocaleString()}.`)) return;
    setOfferBusy(o.id); setOfferError('');
    try {
      await apiAcceptCounter(o.id);
      await Promise.all([loadOffers(), loadOrders()]);
      setTab('orders');
    } catch (e) { setOfferError(e?.message || 'Could not accept the counter-offer'); }
    finally { setOfferBusy(null); }
  };

  const withdrawOffer = async (o, declining) => {
    if (!window.confirm(declining ? 'Decline the seller\'s counter-offer?' : 'Withdraw this offer?')) return;
    setOfferBusy(o.id); setOfferError('');
    try { await apiWithdrawOffer(o.id); await loadOffers(); }
    catch (e) { setOfferError(e?.message || 'Could not update the offer'); }
    finally { setOfferBusy(null); }
  };

  const loadOrders = () => {
    setOrdersState('loading');
    apiGetOrders('buyer')
      .then(data => { setORDERS(adaptOrders(Array.isArray(data) ? data : [])); setOrdersState('ready'); })
      .catch(() => {
        setOrdersState('error');
      });
  };

  const loadTransport = () => {
    setTransportState('loading');
    apiGetMyTransportRequests('requester')
      .then(d => { setTRANSPORT(adaptTransportRequests(Array.isArray(d) ? d : [])); setTransportState('ready'); })
      .catch(() => setTransportState('error'));
  };

  // Lab report files are private: mint a fresh short-lived link on every click.
  const openReport = async (t) => {
    setReportError('');
    try {
      if (t.hasReportFile) {
        const { url } = await apiGetTestingReportFile(t.id);
        window.open(url, '_blank', 'noopener');
      } else if (t.reportUrl) {
        window.open(t.reportUrl, '_blank', 'noopener');
      }
    } catch (e) { setReportError(e?.message || 'Could not open the report.'); }
  };

  const loadTesting = () => {
    setTestingState('loading');
    apiGetMyTestingRequests('requester')
      .then(data => { setTESTING(adaptTestingRequests(Array.isArray(data) ? data : [])); setTestingState('ready'); })
      .catch(() => {
        setTestingState('error');
      });
  };

  useEffect(() => {
    loadOrders();
    loadTesting();
    loadTransport();

    loadOffers();

    apiGetSavedProducts()
      .then(data => setSavedProducts(adaptProducts((data || []).map(s => s.product))))
      .catch(() => setSavedProducts([]));
  }, []);

  const activeOrderCount = ORDERS.filter(o => !['delivered', 'completed', 'cancelled', 'rejected'].includes(o.status)).length;
  const totalSpent = ORDERS.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o._raw?.totalAmount || 0), 0);
  const statsCards = [
    ['📋', 'Active Orders',   activeOrderCount, '#2563EB'],
    ['❤️', 'Saved Products', savedProducts.length, '#EC4899'],
    ['🧪', 'Lab Reports',    TESTING.filter(t => t.report).length, '#059669'],
    ['₨',  'Total Ordered',  `₨${totalSpent.toLocaleString()}`, T.gold],
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{portal.initial}</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#2563EB' }}>🛒 Buyer Portal</h1>
          <p style={{ margin: 0, color: T.muted, fontSize: 12 }}>{portal.subtitle || ' '}</p>
        </div>
      </div>

      <Tabs
        tabs={[['overview','📊 Overview'],['saved',`❤️ Saved${savedProducts.length ? ` (${savedProducts.length})` : ''}`],['offers',`💬 Offers${sentOffers.some(o => o.status === 'COUNTERED') ? ' •' : ''}`],['orders','📋 Orders'],['messages','✉️ Messages'],['testing','🧪 Testing'],['transport','🚛 Transport'],['warehouse','🏪 Warehouse']]}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Card>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: '#2563EB' }}>Recent Orders</h3>
              {ordersState === 'loading' && <LoadingState label="Loading orders…" />}
              {ordersState === 'error' && <ErrorState message="Could not load your orders." onRetry={loadOrders} />}
              {ordersState === 'ready' && ORDERS.length === 0 && <EmptyState icon="📋" title="No orders yet" />}
              {ordersState === 'ready' && ORDERS.slice(0, 5).map(o => (
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
              {testingState === 'loading' && <LoadingState label="Loading testing requests…" />}
              {testingState === 'error' && <ErrorState message="Could not load testing requests." onRetry={loadTesting} />}
              {testingState === 'ready' && TESTING.length === 0 && <EmptyState icon="🧪" title="No testing requests yet" />}
              {testingState === 'ready' && TESTING.slice(0, 5).map(t => (
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
          {savedProducts.length === 0 ? (
            <EmptyState icon="❤️" title="No saved products yet" subtitle="Products you save while browsing the marketplace will show up here." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
              {savedProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      )}

      {/* OFFERS — track negotiations; answer counter-offers */}
      {tab === 'offers' && (
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#2563EB' }}>Offers You've Made</h3>
          {offerError && <div style={{ fontSize: 12, color: T.danger, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7, marginBottom: 12 }}>⚠ {offerError}</div>}
          {sentOffers.length === 0 && <EmptyState icon="💬" title="No offers yet" subtitle="Make an offer on a marketplace listing and track it here." />}
          {sentOffers.map(o => {
            const st = String(o.status).toLowerCase();
            const unit = o.product?.unit || '';
            return (
              <div key={o.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.product?.name}</div>
                    <div style={{ fontSize: 12, color: T.muted, margin: '3px 0' }}>
                      {o.product?.seller?.profile?.fullName || 'Seller'} · {o.quantity} {unit} · You offered <strong style={{ color: T.goldText }}>₨{Number(o.offeredPrice).toLocaleString()}</strong> (asking ₨{Number(o.product?.askingPrice || 0).toLocaleString()})
                    </div>
                    {st === 'countered' && o.counterPrice != null && (
                      <div style={{ fontSize: 12, color: T.warnText, marginTop: 4, fontWeight: 700 }}>
                        Seller's counter: ₨{Number(o.counterPrice).toLocaleString()} per {unit} · total ₨{(Number(o.counterPrice) * Number(o.quantity)).toLocaleString()}
                        {o.counterMessage && <span style={{ fontWeight: 400, fontStyle: 'italic' }}> — "{o.counterMessage}"</span>}
                      </div>
                    )}
                    {st === 'rejected' && o.rejectionReason && <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>Declined: {o.rejectionReason}</div>}
                    {['pending', 'countered'].includes(st) && o.expiresAt && (
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Expires {new Date(o.expiresAt).toLocaleString()}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: SC[st]?.bg, color: SC[st]?.c, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{SC[st]?.l || st}</span>
                    {st === 'countered' && (
                      <>
                        <Btn variant="primary" size="sm" disabled={offerBusy === o.id} onClick={() => acceptCounter(o)}>Accept counter</Btn>
                        <Btn variant="ghost" size="sm" disabled={offerBusy === o.id} onClick={() => withdrawOffer(o, true)}>Decline</Btn>
                      </>
                    )}
                    {st === 'pending' && (
                      <Btn variant="ghost" size="sm" disabled={offerBusy === o.id} onClick={() => withdrawOffer(o, false)}>Withdraw</Btn>
                    )}
                    {!['expired', 'withdrawn'].includes(st) && (
                      <Btn variant="ghost" size="sm" onClick={() => { setActiveOffer(o.id); setTab('messages'); }}>Message seller</Btn>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#2563EB' }}>All Orders</h3>
          {ordersState === 'loading' && <LoadingState label="Loading orders…" />}
          {ordersState === 'error' && <ErrorState message="Could not load your orders." onRetry={loadOrders} />}
          {ordersState === 'ready' && ORDERS.length === 0 && <EmptyState icon="📋" title="No orders yet" subtitle="Orders you place in the marketplace will appear here." />}
          {ordersState === 'ready' && ORDERS.map(o => (
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <OrderActions order={o} role="buyer" onChanged={loadOrders} />
                  <Btn variant="ghost" size="sm" onClick={() => setOpenOrder(openOrder === o.id ? null : o.id)}>{openOrder === o.id ? 'Hide details' : 'Details'}</Btn>
                </div>
                {openOrder === o.id && (
                  <div style={{ flexBasis: '100%', background: T.surface, borderRadius: 8, padding: '10px 12px', fontSize: 12, marginTop: 8 }}>
                    {o.timeline?.length ? o.timeline.map((h, i) => (
                      <div key={i} style={{ padding: '3px 0' }}>
                        <strong>{(SC[h.status]?.l) || h.status}</strong> · {h.date}{h.note ? ` — ${h.note}` : ''}
                      </div>
                    )) : <span style={{ color: T.muted }}>No status history recorded yet.</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* MESSAGES — chat with sellers about your offers */}
      {tab === 'messages' && (
        sentOffers.length === 0 ? (
          <Card><EmptyState icon="✉️" title="No messages yet" subtitle="Make an offer on a listing and you can chat with the seller here." /></Card>
        ) : (() => {
          const cur = sentOffers.find(o => o.id === activeOffer) || sentOffers[0];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ borderRight: `1px solid ${T.border}`, background: T.surface }}>
                <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 13, color: '#2563EB' }}>Your offers</div>
                {sentOffers.map(o => (
                  <div key={o.id} {...clickable(() => setActiveOffer(o.id))} style={{ padding: '11px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: cur.id === o.id ? '#EFF6FF' : 'transparent' }}>
                    <div style={{ fontWeight: cur.id === o.id ? 700 : 500, fontSize: 13 }}>{o.product?.seller?.profile?.fullName || 'Seller'}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{o.product?.name} · ₨{Number(o.offeredPrice).toLocaleString()} · {String(o.status).toLowerCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 13 }}>{cur.product?.seller?.profile?.fullName || 'Seller'} — {cur.product?.name}</div>
                <OfferThread key={cur.id} offerId={cur.id} closed={['EXPIRED', 'WITHDRAWN'].includes(cur.status)} />
              </div>
            </div>
          );
        })()
      )}

      {/* TESTING */}
      {tab === 'testing' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#059669' }}>Testing Requests</h3>
            <Btn variant="teal" size="sm" onClick={() => navigate('/testing')}>+ Request Test</Btn>
          </div>
          {reportError && <div style={{ color: '#B91C1C', fontSize: 12, marginBottom: 10 }}>⚠ {reportError}</div>}
          {testingState === 'loading' && <LoadingState label="Loading testing requests…" />}
          {testingState === 'error' && <ErrorState message="Could not load testing requests." onRetry={loadTesting} />}
          {testingState === 'ready' && TESTING.length === 0 && <EmptyState icon="🧪" title="No testing requests yet" subtitle="Request a lab test from a product page to see it here." />}
          {testingState === 'ready' && TESTING.map(t => (
            <Card key={t.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#059669', marginBottom: 3 }}>{t.id}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.product}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{t.agency} · {t.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: SC[t.status]?.bg, color: SC[t.status]?.c, padding: '3px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{SC[t.status]?.l}</span>
                  {(t.reportUrl || t.hasReportFile) && <Btn variant="secondary" size="sm" onClick={() => openReport(t)}>📄 View Report</Btn>}
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
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0891B2' }}>Transport Requests</h3>
            <Btn variant="cyan" size="sm" onClick={() => navigate('/transport')}>+ Request Transport</Btn>
          </div>
          {transportState === 'loading' && <LoadingState label="Loading transport requests…" />}
          {transportState === 'error' && <ErrorState message="Could not load transport requests." onRetry={loadTransport} />}
          {transportState === 'ready' && TRANSPORT.length === 0 && <EmptyState icon="🚛" title="No transport requests yet" subtitle="Request a quote from a transporter and it will show up here." />}
          {transportState === 'ready' && TRANSPORT.map(r => <TransportRequestCard key={r.id} r={r} onChanged={loadTransport} />)}
        </div>
      )}

      {/* WAREHOUSE TAB */}
      {tab === 'warehouse' && <PortalWarehouseTab accent="#B45309" />}
    </div>
  );
}
