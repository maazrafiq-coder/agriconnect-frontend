import { useState, useEffect } from 'react';
import {
  apiAdminGetUsers,
  apiAdminGetProducts,
  apiAdminGetOrders,
  apiAdminGetWarehouses,
  apiAdminResetUserPassword,
  apiAdminGetAllAgencies,
  apiAdminGetAllTransporters,
  apiRequestClarification,
  apiAdminGetOrderSummary,
} from '../lib/api';
import { Btn, Modal } from '../components/ui';
import AdminUserDetailModal from '../components/admin/AdminUserDetailModal';
import TextPromptModal from '../components/ui/TextPromptModal';
import { useAuth } from '../context/AuthContext';
import AdminAuditLog from '../components/admin/AdminAuditLog';
import AdminLienQueue from '../components/admin/AdminLienQueue';
import AdminListingDetailModal from '../components/admin/AdminListingDetailModal';
import T from '../theme';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import { CreateUserModal } from '../components/admin/CreateUserModal';
import { RemoveProductModal } from '../components/admin/RemoveProductModal';
import { DisputeModal } from '../components/admin/DisputeModal';
import { AdminOverviewSection } from '../components/admin/AdminOverviewSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { AdminMarketplaceSection } from '../components/admin/AdminMarketplaceSection';
import { AdminPaymentsSection } from '../components/admin/AdminPaymentsSection';
import { AdminLogisticsSection } from '../components/admin/AdminLogisticsSection';

import { useDeepLink } from '../lib/deeplink';
import { notify } from '../lib/notify';
// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { id: 'users',       icon: '👥', label: 'Users', children: ['Farmers', 'Buyers', 'Transporters', 'Experts', 'Admins'] },
  { id: 'marketplace', icon: '🌾', label: 'Marketplace', children: ['Products', 'Categories', 'Orders'] },
  { id: 'payments',    icon: '💳', label: 'Payments', children: ['Transactions', 'Payouts', 'Refunds'] },
  { id: 'logistics',   icon: '🚛', label: 'Logistics' },
  { id: 'liens',       icon: '🏦', label: 'Loan Applications' },
  { id: 'settings',    icon: '⚙️', label: 'Settings' },
  { id: 'security',    icon: '🔐', label: 'Audit Log' },
];

// Moderators review registrations and loan applications; everything else
// needs ADMIN (the API enforces this — the UI just doesn't offer dead ends).
const MODERATOR_SECTIONS = ['dashboard', 'users', 'liens'];

export default function AdminDashboard() {
  const { user: me } = useAuth();
  const isMod = me?.role === 'moderator';
  const [section, setSection] = useState('dashboard');
  const [userSearch, setUserSearch] = useState('');
  const [subTab, setSubTab] = useState(null);
  const [kycFilter, setKycFilter] = useState('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Data
  const PAGE_SIZE = 20;
  const [users, setUsers] = useState([]);          // current page of the Users table
  const [usersMeta, setUsersMeta] = useState({ total: 0, totalPages: 1 });
  const [userPage, setUserPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [products, setProducts] = useState([]);    // current page of the Products grid
  const [productsMeta, setProductsMeta] = useState({ total: 0, totalPages: 1 });
  const [productPage, setProductPage] = useState(1);
  const [productStatus, setProductStatus] = useState('ALL');
  const [productsLoading, setProductsLoading] = useState(false);
  // Dashboard numbers come from the API's totals, not from whatever rows happen to be loaded.
  const [summary, setSummary] = useState({ totalUsers: 0, pendingKyc: 0, pendingUsers: [], activeListings: 0, pendingProducts: [], totalOrders: 0 });
  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null); // server-side totals (all orders, not just the loaded page)
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [kycModal, setKycModal] = useState(null);
  // Notification links: ?tab=users|liens…&type=kyc&id=<userId> opens that section,
  // and for a KYC conversation opens the person's review dialog directly.
  const adminSections = isMod ? MODERATOR_SECTIONS : ['dashboard', 'users', 'marketplace', 'payments', 'logistics', 'liens', 'settings', 'security'];
  const deepLink = useDeepLink({ validTabs: adminSections, setTab: setSection });
  useEffect(() => {
    if (deepLink.params.type === 'kyc' && deepLink.params.id) setKycModal({ id: deepLink.params.id });
  }, [deepLink.params.type, deepLink.params.id]);
  const [ask, setAsk] = useState(null); // text-prompt dialog config
  const [listingDetail, setListingDetail] = useState(null); // { type, id }
  const [createUserModal, setCreateUserModal] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState(null);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);
  const [testingAgencies, setTestingAgencies] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [removeModal, setRemoveModal] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);

  const [loadError, setLoadError] = useState(null);

  // Round 2, Milestone 6 — admin opens a clarification request against a
  // provider listing (warehouse/testing agency/transport). Reuses the
  // same generic subjectType/subjectId endpoint, and the same
  // prompt()-based UX already used for KYC info-requests in
  // AdminUserDetailModal.jsx. Purely communicative — see
  // ReviewService.requestClarification's comment: unlike KYC, this has
  // no automatic effect on isActive/isVerified.
  const handleRequestProviderInfo = (subjectType, subjectId) => {
    setAsk({
      title: 'Request more information',
      label: 'What additional information is needed from this provider?',
      submitLabel: 'Send request',
      onSubmit: async (note) => { await apiRequestClarification(subjectType, subjectId, note); },
    });
  };

  const loadUsers = () => {
    setUsersLoading(true);
    apiAdminGetUsers({ page: userPage, limit: PAGE_SIZE, search: debouncedSearch, kycStatus: kycFilter === 'ALL' ? '' : kycFilter })
      .then(r => { setUsers(r.data || []); setUsersMeta(r.meta || { total: 0, totalPages: 1 }); })
      .catch(e => setLoadError(prev => [prev, `Users: ${e.message || 'failed to load'}`].filter(Boolean).join(' · ')))
      .finally(() => setUsersLoading(false));
  };
  const loadProducts = () => {
    setProductsLoading(true);
    apiAdminGetProducts({ page: productPage, limit: PAGE_SIZE, status: productStatus === 'ALL' ? '' : productStatus })
      .then(r => { setProducts(r.data || []); setProductsMeta(r.meta || { total: 0, totalPages: 1 }); })
      .catch(e => setLoadError(prev => [prev, `Products: ${e.message || 'failed to load'}`].filter(Boolean).join(' · ')))
      .finally(() => setProductsLoading(false));
  };

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(userSearch.trim()); setUserPage(1); }, 350);
    return () => clearTimeout(t);
  }, [userSearch]);
  useEffect(() => { setUserPage(1); }, [kycFilter]);
  useEffect(() => { setProductPage(1); }, [productStatus]);
  useEffect(loadUsers, [userPage, debouncedSearch, kycFilter]);
  useEffect(loadProducts, [productPage, productStatus]);

  const loadAll = () => {
    setLoading(true);
    setLoadError(null);
    loadUsers();
    if (!isMod) loadProducts();
    const adminOnly = (fn) => (isMod ? Promise.resolve(null) : fn());
    Promise.allSettled([
      apiAdminGetUsers({ limit: 1 }),
      apiAdminGetUsers({ kycStatus: 'SUBMITTED', limit: 5 }),
      adminOnly(() => apiAdminGetProducts({ status: 'ACTIVE', limit: 1 })),
      adminOnly(() => apiAdminGetProducts({ status: 'PENDING_REVIEW', limit: 50 })),
      adminOnly(() => apiAdminGetOrders({ limit: 200 })),
      adminOnly(() => apiAdminGetOrderSummary()),
      adminOnly(() => apiAdminGetWarehouses()),
      adminOnly(() => apiAdminGetAllAgencies()),
      adminOnly(() => apiAdminGetAllTransporters()),
    ]).then(([uAll, uPend, pAct, pPend, o, os, w, ta, tr]) => {
      const failures = [];
      const ok = (r, label) => { if (r.status === 'fulfilled') return r.value; failures.push(`${label}: ${r.reason?.message || 'failed to load'}`); return null; };
      const uA = ok(uAll, 'Users'), uP = ok(uPend, 'Users'), pA = ok(pAct, 'Products'), pP = ok(pPend, 'Products');
      setSummary({
        totalUsers: uA?.meta?.total ?? 0,
        pendingKyc: uP?.meta?.total ?? 0,
        pendingUsers: uP?.data || [],
        activeListings: pA?.meta?.total ?? 0,
        pendingProducts: pP?.data || [],
        totalOrders: 0,
      });
      const ord = ok(o, 'Orders'); if (ord) { setOrders(ord.data || []); setSummary(prev => ({ ...prev, totalOrders: ord.meta?.total ?? (ord.data || []).length })); }
      const osum = ok(os, 'Order totals'); if (osum) setOrderSummary(osum);
      const wh = ok(w, 'Warehouses'); if (wh) setWarehouses(Array.isArray(wh) ? wh : []);
      const ag = ok(ta, 'Testing agencies'); if (ag) setTestingAgencies(Array.isArray(ag) ? ag : []);
      const tp = ok(tr, 'Transporters'); if (tp) setTransporters(Array.isArray(tp) ? tp : []);
      if (failures.length > 0) setLoadError(failures.join(' · '));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  // ── Derived stats ──
  const pendingKyc = summary.pendingKyc;
  const activeListings = summary.activeListings;
  const pendingListings = [
    ...warehouses.filter(w => !w.isVerified).map(w => ({ type: 'warehouse', id: w.id, name: w.name, label: 'Warehouse' })),
    ...testingAgencies.filter(a => !a.isVerified).map(a => ({ type: 'testing_agency', id: a.id, name: a.name, label: 'Testing agency' })),
    ...transporters.filter(t => !t.isVerified).map(t => ({ type: 'transport', id: t.id, name: t.companyName, label: 'Transport' })),
    ...summary.pendingProducts.map(p => ({ type: 'product', id: p.id, name: p.name, label: 'Product listing' })),
  ];
  const disputedOrders = orders.filter(o => o.status === 'DISPUTED').length;
  // Revenue = platform fee on COMPLETED orders only (server-side totals).
  // In-progress orders are shown separately and are not revenue.
  const completedValue = orderSummary?.completed?.orderValue ?? 0;
  const platformFees = orderSummary?.completed?.platformRevenue ?? 0;
  const netToSellers = orderSummary?.completed?.netToSellers ?? 0;
  const inProgressValue = orderSummary?.inProgress?.orderValue ?? 0;
  const inProgressFees = orderSummary?.inProgress?.expectedPlatformFees ?? 0;

  const allStatCards = [
    ['👥', 'Total Users', summary.totalUsers, T.green, () => { setSection('users'); setKycFilter('ALL'); }],
    ['⏳', 'Pending KYC', pendingKyc, T.warn, () => { setSection('users'); setKycFilter('SUBMITTED'); }],
    ['🌾', 'Active Listings', activeListings, T.mid, () => { setSection('marketplace'); setSubTab('products'); }],
    ['📋', 'Total Orders', summary.totalOrders, T.info, () => { setSection('marketplace'); setSubTab('orders'); setOrderStatusFilter('ALL'); }],
    ['⚠️', 'Disputed Orders', disputedOrders, T.danger, () => { setSection('marketplace'); setSubTab('orders'); setOrderStatusFilter('DISPUTED'); }],
    ['💰', 'Platform Revenue (completed)', `₨${platformFees.toLocaleString()}`, T.gold, () => setSection('payments')],
  ];
  const statCards = isMod ? allStatCards.slice(0, 2) : allStatCards;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: 'calc(100vh - 58px)', background: T.bg }}>
      {/* SIDEBAR */}
      <div className="ac-admin-sidebar" style={{ width: 220, background: '#0F1F16', flexShrink: 0, padding: '20px 0' }}>
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
          <div style={{ color: T.gold, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{isMod ? 'MODERATOR PORTAL' : 'ADMIN PORTAL'}</div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginTop: 2 }}>AgriConnect PK</div>
        </div>
        {NAV_SECTIONS.filter(s => !isMod || MODERATOR_SECTIONS.includes(s.id)).map(s => (
          <div key={s.id}>
            <button
              type="button"
              aria-current={section === s.id ? 'page' : undefined}
              onClick={() => { setSection(s.id); setSubTab(null); }}
              style={{
                width: '100%', border: 'none', textAlign: 'left', fontFamily: 'inherit',
                padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                background: section === s.id ? 'rgba(116,198,157,0.12)' : 'transparent',
                borderLeft: section === s.id ? `3px solid ${T.mint}` : '3px solid transparent',
                color: section === s.id ? T.mint : 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: section === s.id ? 700 : 400,
              }}
            >
              <span aria-hidden="true">{s.icon}</span>{s.label}
            </button>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: '1 1 320px', minWidth: 0, padding: '28px clamp(14px,3vw,32px)', maxWidth: 1200 }}>

        {loadError && (
          <div style={{ background: '#FEE2E2', border: `1px solid ${T.danger}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: T.danger }}>⚠ Some data failed to load: {loadError}</div>
            <Btn variant="danger" size="sm" onClick={loadAll}>Retry</Btn>
          </div>
        )}

        {/* DASHBOARD */}
        {section === 'dashboard' && <AdminOverviewSection setSection={setSection} setKycFilter={setKycFilter} users={users} summary={summary} orders={orders} loading={loading} setListingDetail={setListingDetail} setDisputeModal={setDisputeModal} pendingKyc={pendingKyc} pendingListings={pendingListings} disputedOrders={disputedOrders} statCards={statCards} />}

        {/* USERS */}
        {section === 'users' && <AdminUsersSection userSearch={userSearch} setUserSearch={setUserSearch} kycFilter={kycFilter} setKycFilter={setKycFilter} users={users} setUsers={setUsers} usersMeta={usersMeta} userPage={userPage} setUserPage={setUserPage} usersLoading={usersLoading} setKycModal={setKycModal} setCreateUserModal={setCreateUserModal} setResetPasswordModal={setResetPasswordModal} loadAll={loadAll} />}

        {/* MARKETPLACE */}
        {section === 'marketplace' && <AdminMarketplaceSection subTab={subTab} setSubTab={setSubTab} orderStatusFilter={orderStatusFilter} setOrderStatusFilter={setOrderStatusFilter} products={products} setProducts={setProducts} productsMeta={productsMeta} productPage={productPage} setProductPage={setProductPage} productStatus={productStatus} setProductStatus={setProductStatus} productsLoading={productsLoading} orders={orders} loading={loading} setAsk={setAsk} setListingDetail={setListingDetail} setRemoveModal={setRemoveModal} loadAll={loadAll} />}

        {/* PAYMENTS -> Orders sub-view (real data available), rest stubbed */}
        {section === 'payments' && <AdminPaymentsSection orders={orders} loading={loading} setDisputeModal={setDisputeModal} completedValue={completedValue} platformFees={platformFees} netToSellers={netToSellers} inProgressValue={inProgressValue} inProgressFees={inProgressFees} />}

        {/* LOGISTICS -> reuse warehouse admin data */}
        {section === 'logistics' && <AdminLogisticsSection warehouses={warehouses} setWarehouses={setWarehouses} loading={loading} setListingDetail={setListingDetail} testingAgencies={testingAgencies} setTestingAgencies={setTestingAgencies} transporters={transporters} setTransporters={setTransporters} handleRequestProviderInfo={handleRequestProviderInfo} />}

        {section === 'liens' && <AdminLienQueue />}
        {section === 'settings' && <SettingsPanel />}
        {section === 'security' && <AdminAuditLog />}
      </div>

      {/* ADMIN — VIEW COMPLETE PROFILE / KYC REVIEW */}
      {kycModal && (
        <AdminUserDetailModal
          userId={kycModal.id}
          onClose={() => setKycModal(null)}
          onKycChanged={(userId, status) => {
            setUsers(prev => prev.map(x => x.id === userId ? { ...x, kycStatus: status } : x));
            loadAll(); // keep dashboard counts in step
          }}
        />
      )}

      {ask && <TextPromptModal {...ask} onClose={() => setAsk(null)} />}

      {listingDetail && (
        <AdminListingDetailModal
          type={listingDetail.type}
          id={listingDetail.id}
          onClose={() => setListingDetail(null)}
          onOpenUser={(userId) => { setListingDetail(null); setKycModal({ id: userId }); }}
          onDecision={loadAll}
        />
      )}

      {createUserModal && (
        <CreateUserModal onClose={() => setCreateUserModal(false)} onCreated={(result) => {
          setCreateUserModal(false);
          setTempPasswordModal(result);
          loadAll();
        }} />
      )}

      {resetPasswordModal && (
        <Modal title={`Reset Password — ${resetPasswordModal.profile?.fullName || resetPasswordModal.phoneNumber}`} onClose={() => setResetPasswordModal(null)}>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
            This generates a new temporary password for this user and immediately logs out all their active sessions. Share it with them securely.
          </p>
          <Btn variant="amber" style={{ width: '100%' }} onClick={async () => {
            try {
              const result = await apiAdminResetUserPassword(resetPasswordModal.id);
              setResetPasswordModal(null);
              setTempPasswordModal({ user: resetPasswordModal, temporaryPassword: result.temporaryPassword });
            } catch (e) { notify(e.message); }
          }}>Generate New Password →</Btn>
        </Modal>
      )}

      {tempPasswordModal && (
        <Modal title="Temporary Password Generated" onClose={() => setTempPasswordModal(null)}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔑</div>
            <p style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
              Share this password securely — it will not be shown again.
            </p>
            <div style={{ background: T.surface, borderRadius: 10, padding: 16, marginBottom: 16, fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: T.green, letterSpacing: 1 }}>
              {tempPasswordModal.temporaryPassword}
            </div>
            <Btn variant="primary" style={{ width: '100%' }} onClick={() => setTempPasswordModal(null)}>Done</Btn>
          </div>
        </Modal>
      )}

      {/* REMOVE PRODUCT MODAL */}
      {removeModal && <RemoveProductModal product={removeModal} onClose={() => setRemoveModal(null)} onRemoved={() => {
        setProducts(prev => prev.map(x => x.id === removeModal.id ? { ...x, status: 'REMOVED' } : x));
        setRemoveModal(null);
      }} />}

      {/* DISPUTE RESOLUTION MODAL */}
      {disputeModal && <DisputeModal order={disputeModal} onClose={() => setDisputeModal(null)} onResolved={(status) => {
        setOrders(prev => prev.map(x => x.id === disputeModal.id ? { ...x, status } : x));
        setDisputeModal(null);
      }} />}
    </div>
  );
}
