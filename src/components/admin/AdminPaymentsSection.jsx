import { Card, Btn } from '../ui';
import { STATUS_COLORS as SC } from '../../data';
import T from '../../theme';

// ─── AdminPaymentsSection ───
export function AdminPaymentsSection({ orders, loading, setDisputeModal, completedValue, platformFees, netToSellers, inProgressValue, inProgressFees }) {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>💳 Payments & Orders</h1>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 20px' }}>Transaction overview, platform commission, and order status</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        {[['Completed Order Value', `₨${completedValue.toLocaleString()}`, T.green], ['Platform Revenue', `₨${platformFees.toLocaleString()}`, T.gold], ['Net to Sellers', `₨${netToSellers.toLocaleString()}`, T.mid], ['In Progress (not revenue)', `₨${inProgressValue.toLocaleString()}`, T.muted], ['Expected Fees on In Progress', `₨${inProgressFees.toLocaleString()}`, T.muted]].map(([label, val, color]) => (
          <Card key={label} style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
        </table></div>
      </Card>

    </div>
  );
}
