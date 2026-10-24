import { useState, useEffect } from 'react';
import { apiGetReceivedOffers, apiGetOrders, apiGetMyProducts, apiGetIssuedInvoices } from '../lib/api';
import { adaptOffers, adaptOrders, adaptProducts } from '../lib/adapters';
import { useNavigate } from 'react-router-dom';
import { Btn, Tabs } from '../components/ui';
import MediaManagerModal from '../components/MediaManager';
import PortalWarehouseTab from '../components/PortalWarehouseTab';
import usePortalProfile from '../lib/usePortalProfile';
import { STATUS_COLORS as SC } from '../data';
import T from '../theme';
import { DeclineOfferModal } from '../components/seller/DeclineOfferModal';
import { NewListingModal } from '../components/seller/NewListingModal';
import { SellerOverviewTab } from '../components/seller/SellerOverviewTab';
import { SellerListingsTab } from '../components/seller/SellerListingsTab';
import { SellerOffersTab } from '../components/seller/SellerOffersTab';
import { SellerOrdersTab } from '../components/seller/SellerOrdersTab';
import { SellerMessagesTab } from '../components/seller/SellerMessagesTab';

import { useApprovalGate } from '../context/ApprovalGate';
import { useDeepLink } from '../lib/deeplink';
import DeepLinkNotice from '../components/DeepLinkNotice';
export default function SellerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [declineModal, setDeclineModal] = useState(null);
  const [newListingModal, setNewListingModal] = useState(false);
  const gate = useApprovalGate();
  const [editListing, setEditListing] = useState(null); // adapted listing being edited
  const [mediaModalProduct, setMediaModalProduct] = useState(null);
  const [activeConvo, setActiveConvo] = useState(0);
  const portal = usePortalProfile();
  const [openOrder, setOpenOrder] = useState(null);
  const [activeOffer, setActiveOffer] = useState(null);
  const [OFFERS, setOFFERS] = useState([]);
  const [offersState, setOffersState] = useState('loading');
  const [ORDERS, setORDERS] = useState([]);
  const [ordersState, setOrdersState] = useState('loading');
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [listingsState, setListingsState] = useState('loading');
  const deepLink = useDeepLink({
    validTabs: ['overview', 'listings', 'offers', 'orders', 'warehouse', 'messages'],
    setTab,
    lookup: {
      offer: { ready: offersState !== 'loading', ids: OFFERS.map(o => o.id) },
      order: { ready: ordersState !== 'loading', ids: ORDERS.map(o => o.id) },
      listing: { ready: listingsState !== 'loading', ids: myListings.map(p => p.id) },
      invoice: { ready: invoicesLoaded, ids: invoices.map(i => i.id) },
    },
  });

  const loadOffers = () => {
    setOffersState('loading');
    apiGetReceivedOffers()
      .then(data => { setOFFERS(adaptOffers(Array.isArray(data) ? data : [])); setOffersState('ready'); })
      .catch(() => {
        setOffersState('error');
      });
  };

  const loadOrders = () => {
    setOrdersState('loading');
    apiGetOrders('seller')
      .then(data => { setORDERS(adaptOrders(Array.isArray(data) ? data : [])); setOrdersState('ready'); })
      .catch(() => {
        setOrdersState('error');
      });
  };

  const loadInvoices = () => {
    apiGetIssuedInvoices().then(d => setInvoices(Array.isArray(d) ? d : [])).catch(() => setInvoices([])).finally(() => setInvoicesLoaded(true));
  };

  // An invoice notification opens the order that holds it.
  useEffect(() => {
    if (deepLink.params.type !== 'invoice') return;
    const inv = invoices.find(i => i.id === deepLink.params.id);
    if (inv) setOpenOrder(inv.orderId);
  }, [invoices, deepLink.params.type, deepLink.params.id]);

  const loadListings = () => {
    setListingsState('loading');
    apiGetMyProducts()
      .then(data => { setMyListings(adaptProducts(Array.isArray(data) ? data : [])); setListingsState('ready'); })
      .catch(() => setListingsState('error'));
  };

  useEffect(() => {
    loadOffers();
    loadOrders();
    loadInvoices();
    loadListings();
  }, []);

  // Conversations are derived from the real offers received (one per buyer);
  // there's no separate seller<->buyer chat backend yet.
  const CONVOS = Object.values(OFFERS.reduce((acc, o) => {
    const key = o.buyerId || o.buyer;
    (acc[key] = acc[key] || { name: o.buyer || 'Buyer', offers: [] }).offers.push(o);
    return acc;
  }, {})).map(c => ({
    ...c,
    preview: `${c.offers[0].product} — ${SC[c.offers[0].status]?.l || c.offers[0].status}`,
    unread: c.offers.some(o => o.status === 'pending'),
  }));
  const convo = CONVOS[Math.min(activeConvo, Math.max(CONVOS.length - 1, 0))];

  const activeListingCount = myListings.filter(p => p.status === 'ACTIVE').length;
  const pendingOfferCount = OFFERS.filter(o => o.status === 'pending').length;
  const activeOrderCount = ORDERS.filter(o => !['delivered', 'completed', 'cancelled', 'rejected'].includes(o.status)).length;
  const revenue = ORDERS.filter(o => ['delivered', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + Number(o._raw?.totalAmount || 0), 0);

  const statsCards = [
    ['📦', 'Active Listings', activeListingCount, T.green],
    ['💬', 'Pending Offers', pendingOfferCount, T.warn],
    ['📋', 'Active Orders', activeOrderCount, T.info],
    ['₨', 'Completed Sales', `₨${revenue.toLocaleString()}`, T.gold],
    ['⭐', 'Avg Rating', portal.avgRating ?? '—', '#F59E0B'],
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{portal.initial}</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.green }}>🌾 Seller Portal</h1>
            <p style={{ margin: 0, color: T.muted, fontSize: 12 }}>{portal.subtitle || ' '}</p>
          </div>
        </div>
        <Btn variant="gold" onClick={gate(() => setNewListingModal(true), 'create a listing')}>+ New Listing</Btn>
      </div>

      <DeepLinkNotice notice={deepLink.notice} onDismiss={deepLink.dismiss} />
      <Tabs
        tabs={[['overview','📊 Overview'],['listings','📦 Listings'],['offers',`💬 Offers${pendingOfferCount ? ` (${pendingOfferCount})` : ''}`],['orders','📋 Orders'],['warehouse','🏪 Warehouse'],['messages','✉️ Messages']]}
        active={tab} onChange={setTab} color={T.green}
      />

      {/* OVERVIEW */}
      {tab === 'overview' && <SellerOverviewTab OFFERS={OFFERS} offersState={offersState} ORDERS={ORDERS} ordersState={ordersState} loadOffers={loadOffers} loadOrders={loadOrders} statsCards={statsCards} />}

      {/* LISTINGS */}
      {tab === 'listings' && <SellerListingsTab navigate={navigate} setNewListingModal={setNewListingModal} setEditListing={setEditListing} setMediaModalProduct={setMediaModalProduct} myListings={myListings} setMyListings={setMyListings} listingsState={listingsState} loadListings={loadListings} />}

      {/* OFFERS */}
      {tab === 'offers' && <SellerOffersTab setDeclineModal={setDeclineModal} OFFERS={OFFERS} offersState={offersState} loadOffers={loadOffers} loadOrders={loadOrders} loadListings={loadListings} />}

      {/* ORDERS */}
      {tab === 'orders' && <SellerOrdersTab openOrder={openOrder} setOpenOrder={setOpenOrder} ORDERS={ORDERS} ordersState={ordersState} loadOrders={loadOrders} loadListings={loadListings} invoices={invoices} loadInvoices={loadInvoices} />}

      {/* MESSAGES — derived from real offers */}
      {tab === 'messages' && <SellerMessagesTab setActiveConvo={setActiveConvo} activeOffer={activeOffer} setActiveOffer={setActiveOffer} CONVOS={CONVOS} convo={convo} />}

      {/* WAREHOUSE TAB */}
      {tab === 'warehouse' && <PortalWarehouseTab accent={T.green} />}

      {declineModal && <DeclineOfferModal offer={declineModal} onClose={() => setDeclineModal(null)} onDeclined={() => {
        setDeclineModal(null);
        loadOffers(); // the server closed the round; re-read instead of patching local state
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

      {editListing && (
        <NewListingModal
          listing={editListing}
          onClose={() => setEditListing(null)}
          onSaved={(updated) => {
            const merged = adaptProducts([{ ...editListing._raw, ...updated }])[0];
            setMyListings(prev => prev.map(x => x.id === editListing.id ? merged : x));
            setEditListing(null);
            loadListings(); // a rejected listing flips back to Pending Review server-side
          }}
        />
      )}

      {mediaModalProduct && (
        <MediaManagerModal
          mode="product"
          entityId={mediaModalProduct._raw?.id || mediaModalProduct.id}
          title={`Photos & Documents — ${mediaModalProduct.name}`}
          onClose={() => setMediaModalProduct(null)}
          onPrimaryChange={(url) => {
            setMyListings(prev => prev.map(x =>
              x.id === mediaModalProduct.id ? { ...x, images: [url, ...(x.images || []).filter(u => u !== url)] } : x
            ));
          }}
        />
      )}
    </div>
  );
}
