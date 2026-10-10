import { apiAdminApproveProduct, apiAdminRejectProduct, apiAdminRestoreProduct } from '../../lib/api';
import { Card, Btn, Badge } from '../ui';
import { STATUS_COLORS as SC } from '../../data';
import T from '../../theme';
import { Pager } from './Pager';
import { CategoriesPanel } from './CategoriesPanel';
import { clickable } from '../../lib/a11y';

// ─── AdminMarketplaceSection ───
export function AdminMarketplaceSection({ subTab, setSubTab, orderStatusFilter, setOrderStatusFilter, products, setProducts, productsMeta, productPage, setProductPage, productStatus, setProductStatus, productsLoading, orders, loading, setAsk, setListingDetail, setRemoveModal, loadAll }) {
  return (
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <select value={productStatus} onChange={e => setProductStatus(e.target.value)}
            style={{ padding: '8px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: T.white }}>
            <option value="ALL">All statuses</option>
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAUSED">Paused</option>
            <option value="REMOVED">Removed</option>
          </select>
        </div>
      )}

      {(subTab || 'products') === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {[...products].sort((a, b) => (a.status === 'PENDING_REVIEW' ? -1 : 0) - (b.status === 'PENDING_REVIEW' ? -1 : 0)).map(p => (
            <Card key={p.id} style={p.status === 'PENDING_REVIEW' ? { border: `1.5px solid #FBBF24` } : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}><span {...clickable(() => setListingDetail({ type: 'product', id: p.id }))} style={{ cursor: 'pointer', color: T.green, textDecoration: 'underline' }} title="View complete details">{p.name}</span></div>
                  <div style={{ fontSize: 11, color: T.muted }}>{p.seller?.profile?.fullName} · {p.category}</div>
                </div>
                <Badge label={p.status.replace(/_/g, ' ')} type={
                  p.status === 'ACTIVE' ? 'green'
                  : p.status === 'PENDING_REVIEW' ? 'gold'
                  : p.status === 'REJECTED' || p.status === 'REMOVED' ? 'red'
                  : 'gray'
                } />
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                {p.quantity} {p.unit} · ₨{Number(p.askingPrice).toLocaleString()} · {p._count?.offers || 0} offers
              </div>
              {p.status === 'REJECTED' && p.rejectionNote && (
                <div style={{ fontSize: 11, color: T.danger, background: '#FEE2E2', padding: '6px 8px', borderRadius: 6, marginBottom: 10 }}>
                  Rejected: {p.rejectionNote}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.status === 'PENDING_REVIEW' && (
                  <>
                    <Btn variant="primary" size="sm" onClick={async () => {
                      try {
                        await apiAdminApproveProduct(p.id);
                        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'ACTIVE' } : x));
                      loadAll();
                      } catch (e) { alert(e.message); }
                    }}>✅ Approve</Btn>
                    <Btn variant="danger" size="sm" onClick={() => setAsk({
                      title: `Reject listing — ${p.name}`,
                      label: 'Reason for rejecting this listing (shown to the seller)',
                      submitLabel: 'Reject listing',
                      onSubmit: async (reason) => {
                        await apiAdminRejectProduct(p.id, reason);
                        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'REJECTED', rejectionNote: reason } : x));
                        loadAll();
                      },
                    })}>❌ Reject</Btn>
                  </>
                )}
                {p.status !== 'REMOVED' && p.status !== 'PENDING_REVIEW' ? (
                  <Btn variant="danger" size="sm" onClick={() => setRemoveModal(p)}>Remove</Btn>
                ) : p.status === 'REMOVED' ? (
                  <Btn variant="secondary" size="sm" onClick={async () => {
                    try {
                      await apiAdminRestoreProduct(p.id);
                      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'ACTIVE' } : x));
                    } catch (e) { alert(e.message); }
                  }}>Restore</Btn>
                ) : null}
              </div>
            </Card>
          ))}
          {products.length === 0 && !productsLoading && (
            <p style={{ color: T.muted, fontSize: 13 }}>No listings found.</p>
          )}
        </div>
      )}
      {(subTab || 'products') === 'products' && (
        <Pager page={productPage} totalPages={productsMeta.totalPages} total={productsMeta.total} busy={productsLoading} onPage={setProductPage} />
      )}

      {subTab === 'categories' && <CategoriesPanel />}

      {subTab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: T.white }}>
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DISPUTED">Disputed</option>
            </select>
          </div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.green }}>
                {['Order', 'Buyer', 'Seller', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => orderStatusFilter === 'ALL' || o.status === orderStatusFilter).map((o, i) => (
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
              {orders.filter(o => orderStatusFilter === 'ALL' || o.status === orderStatusFilter).length === 0 && !loading && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No orders found.</td></tr>
              )}
            </tbody>
          </table></div>
          </Card>
        </div>
      )}
    </div>
  );
}
