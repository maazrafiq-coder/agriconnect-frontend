import { useState, useEffect } from 'react';
import {
  apiAdminGetUsers, apiAdminUpdateKyc, apiAdminSetUserActive,
  apiAdminGetProducts, apiAdminRemoveProduct, apiAdminRestoreProduct,
  apiAdminGetOrders, apiAdminResolveDispute,
  apiAdminGetWarehouses, apiAdminVerifyWarehouse,
  apiAdminGetCategories, apiAdminCreateCategory, apiAdminUpdateCategory,
  apiAdminDeactivateCategory, apiAdminReactivateCategory,
  apiAdminGetCities, apiAdminCreateCity, apiAdminUpdateCity,
  apiAdminDeactivateCity, apiAdminReactivateCity,
  apiAdminGetUnits, apiAdminCreateUnit, apiAdminUpdateUnit,
  apiAdminDeactivateUnit, apiAdminReactivateUnit,
} from '../lib/api';
import { Card, Btn, Badge, Modal } from '../components/ui';
import { STATUS_COLORS as SC } from '../data';
import T from '../theme';

const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { id: 'users',       icon: '👥', label: 'Users', children: ['Farmers', 'Buyers', 'Transporters', 'Experts', 'Admins'] },
  { id: 'marketplace', icon: '🌾', label: 'Marketplace', children: ['Products', 'Categories', 'Orders'] },
  { id: 'payments',    icon: '💳', label: 'Payments', children: ['Transactions', 'Payouts', 'Refunds'] },
  { id: 'logistics',   icon: '🚛', label: 'Logistics' },
  { id: 'content',     icon: '📰', label: 'Content' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'support',     icon: '🎧', label: 'Support' },
  { id: 'reports',     icon: '📈', label: 'Reports' },
  { id: 'settings',    icon: '⚙️', label: 'Settings' },
  { id: 'security',    icon: '🔐', label: 'Security' },
];

const ComingSoon = ({ title, features }) => (
  <Card style={{ textAlign: 'center', padding: 48 }}>
    <div style={{ fontSize: 42, marginBottom: 14 }}>🚧</div>
    <h3 style={{ fontSize: 16, fontWeight: 800, color: T.green, margin: '0 0 8px' }}>{title} — Coming Soon</h3>
    <p style={{ fontSize: 13, color: T.muted, maxWidth: 420, margin: '0 auto 18px', lineHeight: 1.6 }}>
      This section is scoped and ready to build — it needs backend endpoints that don't exist yet.
    </p>
    {features && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 460, margin: '0 auto' }}>
        {features.map(f => (
          <span key={f} style={{ fontSize: 11, background: T.surface, color: T.muted, padding: '4px 10px', borderRadius: 12, border: `1px solid ${T.border}` }}>{f}</span>
        ))}
      </div>
    )}
  </Card>
);

export default function AdminDashboard() {
  const [section, setSection] = useState('dashboard');
  const [subTab, setSubTab] = useState(null);

  // Data
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [kycModal, setKycModal] = useState(null);
  const [removeModal, setRemoveModal] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      apiAdminGetUsers().catch(() => ({ data: [] })),
      apiAdminGetProducts().catch(() => ({ data: [] })),
      apiAdminGetOrders().catch(() => ({ data: [] })),
      apiAdminGetWarehouses().catch(() => []),
    ]).then(([u, p, o, w]) => {
      setUsers(u.data || []);
      setProducts(p.data || []);
      setOrders(o.data || []);
      setWarehouses(Array.isArray(w) ? w : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  // ── Derived stats ──
  const pendingKyc = users.filter(u => u.kycStatus === 'SUBMITTED').length;
  const activeListings = products.filter(p => p.status === 'ACTIVE').length;
  const disputedOrders = orders.filter(o => o.status === 'DISPUTED').length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const platformFees = orders.reduce((s, o) => s + Number(o.platformFee || 0), 0);

  const statCards = [
    ['👥', 'Total Users', users.length, T.green],
    ['⏳', 'Pending KYC', pendingKyc, T.warn],
    ['🌾', 'Active Listings', activeListings, T.mid],
    ['📋', 'Total Orders', orders.length, T.info],
    ['⚠️', 'Disputed Orders', disputedOrders, T.danger],
    ['💰', 'Platform Revenue', `₨${platformFees.toLocaleString()}`, T.gold],
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 58px)', background: T.bg }}>
      {/* SIDEBAR */}
      <div style={{ width: 220, background: '#0F1F16', flexShrink: 0, padding: '20px 0' }}>
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
          <div style={{ color: T.gold, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>ADMIN PORTAL</div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginTop: 2 }}>AgriConnect PK</div>
        </div>
        {NAV_SECTIONS.map(s => (
          <div key={s.id}>
            <div
              onClick={() => { setSection(s.id); setSubTab(null); }}
              style={{
                padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                background: section === s.id ? 'rgba(116,198,157,0.12)' : 'transparent',
                borderLeft: section === s.id ? `3px solid ${T.mint}` : '3px solid transparent',
                color: section === s.id ? T.mint : 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: section === s.id ? 700 : 400,
              }}
            >
              <span>{s.icon}</span>{s.label}
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '28px 32px', maxWidth: 1200 }}>

        {/* DASHBOARD */}
        {section === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>📊 Admin Dashboard</h1>
            <p style={{ fontSize: 13, color: T.muted, margin: '0 0 24px' }}>Platform overview and pending actions</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
              {statCards.map(([icon, label, val, color]) => (
                <Card key={label} style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color }}>{loading ? '…' : val}</div>
                  <div style={{ fontSize: 28, position: 'absolute', opacity: 0.06, right: 12, top: 10 }}>{icon}</div>
                </Card>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: T.green }}>⏳ Pending Approvals</h3>
                {users.filter(u => u.kycStatus === 'SUBMITTED').slice(0, 5).map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                    <span>{u.profile?.fullName || u.phoneNumber}</span>
                    <Btn variant="secondary" size="sm" onClick={() => { setSection('users'); }}>Review</Btn>
                  </div>
                ))}
                {pendingKyc === 0 && <p style={{ fontSize: 12, color: T.muted }}>No pending KYC reviews.</p>}
              </Card>
              <Card>
                <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: T.danger }}>⚠️ Disputed Orders</h3>
                {orders.filter(o => o.status === 'DISPUTED').slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                    <span>{o.offer?.product?.name || o.id.slice(0, 8)}</span>
                    <Btn variant="secondary" size="sm" onClick={() => setDisputeModal(o)}>Resolve</Btn>
                  </div>
                ))}
                {disputedOrders === 0 && <p style={{ fontSize: 12, color: T.muted }}>No disputes right now.</p>}
              </Card>
            </div>
          </div>
        )}

        {/* USERS */}
        {section === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>👥 User Management</h1>
                <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Farmers · Buyers · Transporters · KYC · Activate/Suspend</p>
              </div>
              <Btn variant="secondary" onClick={loadAll}>↻ Refresh</Btn>
            </div>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.green }}>
                    {['User', 'Role', 'City', 'KYC Status', 'Account', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ background: i % 2 === 0 ? T.surface : T.white }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{u.profile?.fullName || '—'}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>{u.phoneNumber}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{u.role}</td>
                      <td style={{ padding: '10px 14px' }}>{u.profile?.city || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: u.kycStatus === 'APPROVED' ? '#DCFCE7' : u.kycStatus === 'SUBMITTED' ? '#FEF3C7' : u.kycStatus === 'REJECTED' ? '#FEE2E2' : '#F3F4F6',
                          color: u.kycStatus === 'APPROVED' ? '#15803D' : u.kycStatus === 'SUBMITTED' ? '#B45309' : u.kycStatus === 'REJECTED' ? '#DC2626' : '#6B7280',
                          padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                        }}>{u.kycStatus}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: u.isActive ? '#15803D' : T.danger, fontWeight: 700 }}>{u.isActive ? 'Active' : 'Suspended'}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {u.kycStatus === 'SUBMITTED' && (
                            <Btn variant="primary" size="sm" onClick={() => setKycModal(u)}>Review KYC</Btn>
                          )}
                          <Btn variant={u.isActive ? 'danger' : 'secondary'} size="sm" onClick={async () => {
                            try {
                              await apiAdminSetUserActive(u.id, !u.isActive);
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
                            } catch (e) { alert(e.message); }
                          }}>{u.isActive ? 'Suspend' : 'Activate'}</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* MARKETPLACE */}
        {section === 'marketplace' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>🌾 Marketplace Management</h1>
            <p style={{ fontSize: 13, color: T.muted, margin: '0 0 16px' }}>Products · Categories · Orders</p>

            <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 20 }}>
              {[['products', '📦 Products'], ['categories', '🏷️ Categories'], ['orders', '📋 Orders']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSubTab(id)}
                  style={{
                    background: 'none', border: 'none', padding: '9px 16px', cursor: 'pointer',
                    fontSize: 13, fontWeight: (subTab || 'products') === id ? 700 : 400,
                    color: (subTab || 'products') === id ? T.green : T.muted,
                    borderBottom: (subTab || 'products') === id ? `3px solid ${T.green}` : '3px solid transparent',
                    fontFamily: 'inherit', marginBottom: -2,
                  }}
                >{label}</button>
              ))}
            </div>

            {(subTab || 'products') === 'products' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {products.map(p => (
                  <Card key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{p.seller?.profile?.fullName} · {p.category}</div>
                      </div>
                      <Badge label={p.status} type={p.status === 'ACTIVE' ? 'green' : p.status === 'REMOVED' ? 'red' : 'gray'} />
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                      {p.quantity} {p.unit} · ₨{Number(p.askingPrice).toLocaleString()} · {p._count?.offers || 0} offers
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {p.status !== 'REMOVED' ? (
                        <Btn variant="danger" size="sm" onClick={() => setRemoveModal(p)}>Remove</Btn>
                      ) : (
                        <Btn variant="secondary" size="sm" onClick={async () => {
                          try {
                            await apiAdminRestoreProduct(p.id);
                            setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'ACTIVE' } : x));
                          } catch (e) { alert(e.message); }
                        }}>Restore</Btn>
                      )}
                    </div>
                  </Card>
                ))}
                {products.length === 0 && !loading && (
                  <p style={{ color: T.muted, fontSize: 13 }}>No listings found.</p>
                )}
              </div>
            )}

            {subTab === 'categories' && <CategoriesPanel />}

            {subTab === 'orders' && (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: T.green }}>
                      {['Order', 'Buyer', 'Seller', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={o.id} style={{ background: i % 2 === 0 ? T.surface : T.white }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11 }}>{o.id.slice(0, 8)}</td>
                        <td style={{ padding: '10px 14px' }}>{o.buyer?.profile?.fullName || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{o.seller?.profile?.fullName || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>₨{Number(o.totalAmount).toLocaleString()}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: SC[o.status?.toLowerCase()]?.bg, color: SC[o.status?.toLowerCase()]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && !loading && (
                      <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No orders found.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* PAYMENTS -> Orders sub-view (real data available), rest stubbed */}
        {section === 'payments' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>💳 Payments & Orders</h1>
            <p style={{ fontSize: 13, color: T.muted, margin: '0 0 20px' }}>Transaction overview, platform commission, and order status</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
              {[['Total Order Value', `₨${totalRevenue.toLocaleString()}`, T.green], ['Platform Fees', `₨${platformFees.toLocaleString()}`, T.gold], ['Net to Sellers', `₨${(totalRevenue - platformFees).toLocaleString()}`, T.mid]].map(([label, val, color]) => (
                <Card key={label} style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                </Card>
              ))}
            </div>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.green }}>
                    {['Order', 'Buyer', 'Seller', 'Amount', 'Fee', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ background: i % 2 === 0 ? T.surface : T.white }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11 }}>{o.id.slice(0, 8)}</td>
                      <td style={{ padding: '10px 14px' }}>{o.buyer?.profile?.fullName || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{o.seller?.profile?.fullName || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>₨{Number(o.totalAmount).toLocaleString()}</td>
                      <td style={{ padding: '10px 14px' }}>₨{Number(o.platformFee).toLocaleString()}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: SC[o.status?.toLowerCase()]?.bg, color: SC[o.status?.toLowerCase()]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{o.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {o.status === 'DISPUTED' && <Btn variant="secondary" size="sm" onClick={() => setDisputeModal(o)}>Resolve</Btn>}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && !loading && (
                    <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>

            <div style={{ marginTop: 16 }}>
              <ComingSoon title="Farmer Payouts, Wallets & Refund Processing" features={['Automated payout scheduling', 'Digital wallet ledger', 'Refund workflow', 'Easypaisa/JazzCash reconciliation']} />
            </div>
          </div>
        )}

        {/* LOGISTICS -> reuse warehouse admin data */}
        {section === 'logistics' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>🚛 Logistics</h1>
            <p style={{ fontSize: 13, color: T.muted, margin: '0 0 20px' }}>Warehouse network verification (transport request management coming soon)</p>
            <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.green }}>
                    {['Warehouse', 'City', 'Type', 'Capacity', 'Verified', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map((w, i) => (
                    <tr key={w.id} style={{ background: i % 2 === 0 ? T.surface : T.white }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{w.name}</td>
                      <td style={{ padding: '10px 14px' }}>{w.city}</td>
                      <td style={{ padding: '10px 14px' }}>{w.type}</td>
                      <td style={{ padding: '10px 14px' }}>{w.totalCapacityTons?.toLocaleString()} tons</td>
                      <td style={{ padding: '10px 14px' }}>{w.isVerified ? '✅ Verified' : '⏳ Pending'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Btn variant={w.isVerified ? 'ghost' : 'primary'} size="sm" onClick={async () => {
                          try {
                            await apiAdminVerifyWarehouse(w.id, !w.isVerified);
                            setWarehouses(prev => prev.map(x => x.id === w.id ? { ...x, isVerified: !x.isVerified } : x));
                          } catch (e) { alert(e.message); }
                        }}>{w.isVerified ? 'Unverify' : 'Verify'}</Btn>
                      </td>
                    </tr>
                  ))}
                  {warehouses.length === 0 && !loading && (
                    <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No warehouses registered.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
            <ComingSoon title="Delivery Requests & Transporter Assignment" features={['Live shipment map', 'Transporter auto-assignment', 'Delivery charge management']} />
          </div>
        )}

        {/* STUB SECTIONS */}
        {section === 'content' && <ComingSoon title="Content Management" features={['News & blog editor', 'Farming tips CMS', 'FAQ management', 'Homepage banners', 'Announcements']} />}
        {section === 'notifications' && <ComingSoon title="Notifications Center" features={['Push notification composer', 'Email/SMS templates', 'Broadcast messages', 'User segmentation']} />}
        {section === 'support' && <ComingSoon title="Support & Moderation" features={['Support ticket queue', 'Complaint resolution', 'Review moderation', 'User feedback log']} />}
        {section === 'reports' && <ComingSoon title="Reports & Analytics" features={['Sales reports', 'Revenue trends', 'User growth', 'Crop demand forecasting', 'CSV/PDF export']} />}
        {section === 'settings' && <SettingsPanel />}
        {section === 'security' && <ComingSoon title="Security Center" features={['Audit logs', 'Login history', 'Two-factor authentication', 'Active session management']} />}
      </div>

      {/* KYC REVIEW MODAL */}
      {kycModal && (
        <Modal title={`Review KYC — ${kycModal.profile?.fullName || kycModal.phoneNumber}`} onClose={() => setKycModal(null)}>
          <div style={{ background: T.surface, borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Role: <strong>{kycModal.role}</strong></div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Phone: <strong>{kycModal.phoneNumber}</strong></div>
            <div style={{ fontSize: 12, color: T.muted }}>City: <strong>{kycModal.profile?.city || '—'}</strong></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Btn variant="primary" onClick={async () => {
              try {
                await apiAdminUpdateKyc(kycModal.id, 'APPROVED');
                setUsers(prev => prev.map(x => x.id === kycModal.id ? { ...x, kycStatus: 'APPROVED' } : x));
                setKycModal(null);
              } catch (e) { alert(e.message); }
            }}>✅ Approve</Btn>
            <Btn variant="danger" onClick={async () => {
              const note = prompt('Reason for rejection:');
              if (!note) return;
              try {
                await apiAdminUpdateKyc(kycModal.id, 'REJECTED', note);
                setUsers(prev => prev.map(x => x.id === kycModal.id ? { ...x, kycStatus: 'REJECTED' } : x));
                setKycModal(null);
              } catch (e) { alert(e.message); }
            }}>❌ Reject</Btn>
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

// ─── CATEGORIES PANEL ───────────────────────────────────────────────────────
// This is the actual "add a new category like Pulses" feature. Categories
// are real database rows now, not a hardcoded enum — admins can add,
// rename, or deactivate them here without any code deploy.
function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const load = () => {
    setLoading(true);
    apiAdminGetCategories().then(setCategories).catch(() => setCategories([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          {categories.length} categories · {categories.filter(c => c.isActive).length} active
        </p>
        <Btn variant="gold" onClick={() => setAddModal(true)}>+ Add Category</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
        {categories.map(c => (
          <Card key={c.id} style={{ opacity: c.isActive ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>{c.icon || '📦'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace' }}>{c.slug}</div>
                </div>
              </div>
              <Badge label={c.isActive ? 'Active' : 'Inactive'} type={c.isActive ? 'green' : 'gray'} />
            </div>
            {c.description && <p style={{ fontSize: 11, color: T.muted, margin: '0 0 8px' }}>{c.description}</p>}
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
              {c.activeProductCount} active listing{c.activeProductCount === 1 ? '' : 's'}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="secondary" size="sm" onClick={() => setEditModal(c)}>Edit</Btn>
              {c.isActive ? (
                <Btn variant="danger" size="sm" onClick={async () => {
                  try {
                    const result = await apiAdminDeactivateCategory(c.id);
                    if (result.warning) alert(result.warning);
                    setCategories(prev => prev.map(x => x.id === c.id ? { ...x, isActive: false } : x));
                  } catch (e) { alert(e.message); }
                }}>Deactivate</Btn>
              ) : (
                <Btn variant="secondary" size="sm" onClick={async () => {
                  try {
                    await apiAdminReactivateCategory(c.id);
                    setCategories(prev => prev.map(x => x.id === c.id ? { ...x, isActive: true } : x));
                  } catch (e) { alert(e.message); }
                }}>Reactivate</Btn>
              )}
            </div>
          </Card>
        ))}
        {categories.length === 0 && !loading && (
          <p style={{ color: T.muted, fontSize: 13 }}>No categories yet — add one to get started.</p>
        )}
      </div>

      {addModal && (
        <CategoryFormModal
          title="Add New Category"
          onClose={() => setAddModal(false)}
          onSave={async (data) => {
            const created = await apiAdminCreateCategory(data);
            setCategories(prev => [...prev, { ...created, activeProductCount: 0 }]);
            setAddModal(false);
          }}
        />
      )}

      {editModal && (
        <CategoryFormModal
          title={`Edit — ${editModal.name}`}
          initial={editModal}
          isEdit
          onClose={() => setEditModal(null)}
          onSave={async (data) => {
            const updated = await apiAdminUpdateCategory(editModal.id, data);
            setCategories(prev => prev.map(x => x.id === editModal.id ? { ...x, ...updated } : x));
            setEditModal(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryFormModal({ title, initial, isEdit, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('Category name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, icon: icon || undefined, description: description || undefined });
    } catch (err) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>CATEGORY NAME *</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Herbs & Spices" style={{ ...inputStyle, marginBottom: 12 }} />

      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>ICON (emoji, optional)</label>
      <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🌿" style={{ ...inputStyle, marginBottom: 12 }} />

      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>DESCRIPTION (optional)</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Shown as a tooltip in filters" style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />

      {isEdit && (
        <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11, color: '#92400E' }}>
          ℹ️ The URL slug ({initial.slug}) stays fixed once products use it — only the display name, icon, and description can change.
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}

      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSave} disabled={loading}>
        {loading ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Category →'}
      </Btn>
    </Modal>
  );
}

// ─── SETTINGS PANEL ─────────────────────────────────────────────────────────
function SettingsPanel() {
  const [tab, setTab] = useState('cities');
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>⚙️ Platform Settings</h1>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 16px' }}>Cities and units of measurement used across listings</p>

      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 20 }}>
        {[['cities', '🏙️ Cities'], ['units', '📏 Units of Measurement'], ['other', '🔧 Other Settings']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: 'none', border: 'none', padding: '9px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === id ? 700 : 400,
              color: tab === id ? T.green : T.muted,
              borderBottom: tab === id ? `3px solid ${T.green}` : '3px solid transparent',
              fontFamily: 'inherit', marginBottom: -2,
            }}
          >{label}</button>
        ))}
      </div>

      {tab === 'cities' && <CitiesPanel />}
      {tab === 'units' && <UnitsPanel />}
      {tab === 'other' && <ComingSoon title="Commission & Gateway Settings" features={['Commission rates', 'Payment gateway config', 'Email/SMS provider setup', 'Language & localisation']} />}
    </div>
  );
}

// ─── CITIES PANEL ───────────────────────────────────────────────────────────
function CitiesPanel() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const load = () => {
    setLoading(true);
    apiAdminGetCities().then(setCities).catch(() => setCities([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const byProvince = cities.reduce((acc, c) => {
    (acc[c.province] = acc[c.province] || []).push(c);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>{cities.length} cities across {Object.keys(byProvince).length} provinces</p>
        <Btn variant="gold" onClick={() => setAddModal(true)}>+ Add City</Btn>
      </div>

      {Object.entries(byProvince).map(([province, list]) => (
        <div key={province} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 8 }}>{province} ({list.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {list.map(c => (
              <Card key={c.id} style={{ padding: 12, opacity: c.isActive ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <Badge label={c.isActive ? 'Active' : 'Inactive'} type={c.isActive ? 'green' : 'gray'} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <Btn variant="secondary" size="sm" onClick={() => setEditModal(c)}>Edit</Btn>
                  {c.isActive ? (
                    <Btn variant="danger" size="sm" onClick={async () => {
                      try { await apiAdminDeactivateCity(c.id); setCities(prev => prev.map(x => x.id === c.id ? { ...x, isActive: false } : x)); } catch (e) { alert(e.message); }
                    }}>Deactivate</Btn>
                  ) : (
                    <Btn variant="secondary" size="sm" onClick={async () => {
                      try { await apiAdminReactivateCity(c.id); setCities(prev => prev.map(x => x.id === c.id ? { ...x, isActive: true } : x)); } catch (e) { alert(e.message); }
                    }}>Reactivate</Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
      {cities.length === 0 && !loading && <p style={{ color: T.muted, fontSize: 13 }}>No cities yet — add one to get started.</p>}

      {addModal && (
        <CityFormModal title="Add New City" onClose={() => setAddModal(false)} onSave={async (data) => {
          const created = await apiAdminCreateCity(data);
          setCities(prev => [...prev, created]);
          setAddModal(false);
        }} />
      )}
      {editModal && (
        <CityFormModal title={`Edit — ${editModal.name}`} initial={editModal} onClose={() => setEditModal(null)} onSave={async (data) => {
          const updated = await apiAdminUpdateCity(editModal.id, data);
          setCities(prev => prev.map(x => x.id === editModal.id ? { ...x, ...updated } : x));
          setEditModal(null);
        }} />
      )}
    </div>
  );
}

function CityFormModal({ title, initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [province, setProvince] = useState(initial?.province || 'Punjab');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('City name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, province });
    } catch (err) {
      setError(err.message || 'Failed to save city');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>CITY NAME *</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bahawalpur" style={{ ...inputStyle, marginBottom: 12 }} />
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PROVINCE</label>
      <select value={province} onChange={e => setProvince(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
        {['Punjab', 'Sindh', 'KPK', 'Balochistan'].map(p => <option key={p}>{p}</option>)}
      </select>
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save →'}</Btn>
    </Modal>
  );
}

// ─── UNITS PANEL ────────────────────────────────────────────────────────────
function UnitsPanel() {
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiAdminGetUnits().catch(() => []),
      apiAdminGetCategories().catch(() => []),
    ]).then(([u, c]) => { setUnits(u); setCategories(c); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const globalUnits = units.filter(u => !u.categoryId);
  const scopedUnits = units.filter(u => u.categoryId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          {globalUnits.length} global units (apply to all categories) · {scopedUnits.length} category-specific
        </p>
        <Btn variant="gold" onClick={() => setAddModal(true)}>+ Add Unit</Btn>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 8 }}>🌐 Global — available for every category</div>
        <UnitGrid list={globalUnits} onEdit={setEditModal} setUnits={setUnits} />
      </div>

      {categories.map(cat => {
        const list = scopedUnits.filter(u => u.categoryId === cat.id || u.category?.name === cat.name);
        if (list.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 8 }}>{cat.icon} {cat.name}-specific</div>
            <UnitGrid list={list} onEdit={setEditModal} setUnits={setUnits} />
          </div>
        );
      })}

      {units.length === 0 && !loading && <p style={{ color: T.muted, fontSize: 13 }}>No units yet — add one to get started.</p>}

      {addModal && (
        <UnitFormModal title="Add New Unit" categories={categories} onClose={() => setAddModal(false)} onSave={async (data) => {
          const created = await apiAdminCreateUnit(data);
          setUnits(prev => [...prev, created]);
          setAddModal(false);
        }} />
      )}
      {editModal && (
        <UnitFormModal title={`Edit — ${editModal.name}`} initial={editModal} categories={categories} isEdit onClose={() => setEditModal(null)} onSave={async (data) => {
          const updated = await apiAdminUpdateUnit(editModal.id, { name: data.name, sortOrder: data.sortOrder });
          setUnits(prev => prev.map(x => x.id === editModal.id ? { ...x, ...updated } : x));
          setEditModal(null);
        }} />
      )}
    </div>
  );
}

function UnitGrid({ list, onEdit, setUnits }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
      {list.map(u => (
        <Card key={u.id} style={{ padding: 12, opacity: u.isActive ? 1 : 0.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
            <Badge label={u.isActive ? 'Active' : 'Inactive'} type={u.isActive ? 'green' : 'gray'} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Btn variant="secondary" size="sm" onClick={() => onEdit(u)}>Edit</Btn>
            {u.isActive ? (
              <Btn variant="danger" size="sm" onClick={async () => {
                try { await apiAdminDeactivateUnit(u.id); setUnits(prev => prev.map(x => x.id === u.id ? { ...x, isActive: false } : x)); } catch (e) { alert(e.message); }
              }}>Deactivate</Btn>
            ) : (
              <Btn variant="secondary" size="sm" onClick={async () => {
                try { await apiAdminReactivateUnit(u.id); setUnits(prev => prev.map(x => x.id === u.id ? { ...x, isActive: true } : x)); } catch (e) { alert(e.message); }
              }}>Reactivate</Btn>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function UnitFormModal({ title, initial, categories, isEdit, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('Unit name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, categoryId: categoryId || undefined });
    } catch (err) {
      setError(err.message || 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>UNIT NAME *</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Crates, Litres, Bales" style={{ ...inputStyle, marginBottom: 12 }} />

      {!isEdit && (
        <>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>APPLIES TO</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
            <option value="">🌐 All categories (global)</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name} only</option>)}
          </select>
        </>
      )}
      {isEdit && (
        <div style={{ background: T.surface, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11, color: T.muted }}>
          Scope ({initial.categoryId ? initial.category?.name : 'Global — all categories'}) can't be changed after creation — deactivate this unit and create a new one to move it to a different category.
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Unit →'}</Btn>
    </Modal>
  );
}

function RemoveProductModal({ product, onClose, onRemoved }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal title={`Remove Listing — ${product.name}`} onClose={onClose}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>REASON *</label>
      <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Fraudulent listing, policy violation, etc." style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12 }}>⚠ {error}</div>}
      <Btn variant="danger" style={{ width: '100%' }} onClick={async () => {
        if (!reason.trim()) { setError('Reason is required'); return; }
        try {
          await apiAdminRemoveProduct(product.id, reason);
          onRemoved();
        } catch (e) { setError(e.message); }
      }}>Confirm Removal →</Btn>
    </Modal>
  );
}

function DisputeModal({ order, onClose, onResolved }) {
  const [resolution, setResolution] = useState('completed');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal title={`Resolve Dispute — Order ${order.id.slice(0, 8)}`} onClose={onClose}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 8 }}>RESOLUTION</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['completed', '✅ Complete Sale'], ['cancelled', '❌ Cancel & Void']].map(([val, label]) => (
          <button key={val} onClick={() => setResolution(val)} style={{ flex: 1, padding: 10, border: `2px solid ${resolution === val ? T.green : T.border}`, background: resolution === val ? '#F0FDF4' : T.white, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>{label}</button>
        ))}
      </div>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>RESOLUTION NOTES *</label>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Explain the resolution decision..." style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={async () => {
        if (!note.trim()) { setError('Resolution notes are required'); return; }
        try {
          await apiAdminResolveDispute(order.id, resolution, note);
          onResolved(resolution === 'completed' ? 'COMPLETED' : 'CANCELLED');
        } catch (e) { setError(e.message); }
      }}>Confirm Resolution →</Btn>
    </Modal>
  );
}
