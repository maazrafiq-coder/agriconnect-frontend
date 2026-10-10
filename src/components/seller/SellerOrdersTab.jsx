import { Card, Btn, LoadingState, ErrorState, EmptyState } from '../ui';
import OrderActions from '../OrderActions';
import { STATUS_COLORS as SC } from '../../data';
import T from '../../theme';

// ─── SellerOrdersTab ───
export function SellerOrdersTab({ openOrder, setOpenOrder, ORDERS, ordersState, loadOrders, loadListings }) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: T.green }}>All Orders</h3>
      {ordersState === 'loading' && <LoadingState label="Loading orders…" />}
      {ordersState === 'error' && <ErrorState message="Could not load orders." onRetry={loadOrders} />}
      {ordersState === 'ready' && ORDERS.length === 0 && <EmptyState icon="📋" title="No orders yet" />}
      {ordersState === 'ready' && ORDERS.map(o => (
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
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <OrderActions order={o} role="seller" onChanged={() => { loadOrders(); loadListings(); }} />
              <Btn variant="ghost" size="sm" onClick={() => setOpenOrder(openOrder === o.id ? null : o.id)}>{openOrder === o.id ? 'Hide details' : 'View Details'}</Btn>
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
  );
}
