import { Card, Btn } from '../ui';
import T from '../../theme';
import { clickable } from '../../lib/a11y';

// ─── AdminOverviewSection ───
export function AdminOverviewSection({ setSection, setKycFilter, users, summary, orders, loading, setListingDetail, setDisputeModal, pendingKyc, pendingListings, disputedOrders, statCards }) {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>📊 Admin Dashboard</h1>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 24px' }}>Platform overview and pending actions</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
        {statCards.map(([icon, label, val, color, onClick]) => (
          <Card key={label} onClick={onClick} style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color }}>{loading ? '…' : val}</div>
            <div style={{ fontSize: 28, position: 'absolute', opacity: 0.06, right: 12, top: 10 }}>{icon}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        <Card>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: T.green }}>⏳ Pending Approvals</h3>
          {summary.pendingUsers.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
              <span>{u.profile?.fullName || u.phoneNumber}</span>
              <Btn variant="secondary" size="sm" onClick={() => { setSection('users'); setKycFilter('SUBMITTED'); }}>Review</Btn>
            </div>
          ))}
          {pendingKyc === 0 && pendingListings.length === 0 && <p style={{ fontSize: 12, color: T.muted }}>Nothing awaiting approval.</p>}
          {pendingListings.slice(0, 8).map(l => (
            <div key={`${l.type}-${l.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
              <span>
                <span {...clickable(() => setListingDetail({ type: l.type, id: l.id }))} style={{ cursor: 'pointer', color: T.green, textDecoration: 'underline', fontWeight: 700 }}>{l.name}</span>
                <span style={{ color: T.muted }}> · {l.label}</span>
              </span>
              <Btn variant="secondary" size="sm" onClick={() => setListingDetail({ type: l.type, id: l.id })}>Review</Btn>
            </div>
          ))}
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
  );
}
