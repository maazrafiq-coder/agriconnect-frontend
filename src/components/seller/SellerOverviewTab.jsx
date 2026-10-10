import { Card, LoadingState, ErrorState, EmptyState } from '../ui';
import { STATUS_COLORS as SC } from '../../data';
import T from '../../theme';

// ─── SellerOverviewTab ───
export function SellerOverviewTab({ OFFERS, offersState, ORDERS, ordersState, loadOffers, loadOrders, statsCards }) {
  return (
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
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: T.green }}>Recent Offers</h3>
          {offersState === 'loading' && <LoadingState label="Loading offers…" />}
          {offersState === 'error' && <ErrorState message="Could not load offers." onRetry={loadOffers} />}
          {offersState === 'ready' && OFFERS.length === 0 && <EmptyState icon="💬" title="No offers yet" />}
          {offersState === 'ready' && OFFERS.slice(0, 5).map(o => (
            <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{o.buyer}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{o.product} · {o.qty} · ₨{o.offered}/{o.productUnit || 'unit'}</div>
              </div>
              <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                {SC[o.status]?.l}
              </span>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: T.green }}>Recent Orders</h3>
          {ordersState === 'loading' && <LoadingState label="Loading orders…" />}
          {ordersState === 'error' && <ErrorState message="Could not load orders." onRetry={loadOrders} />}
          {ordersState === 'ready' && ORDERS.length === 0 && <EmptyState icon="📋" title="No orders yet" />}
          {ordersState === 'ready' && ORDERS.slice(0, 5).map(o => (
            <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{o.product}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{o.qty} · {o.value}</div>
                </div>
                <span style={{ background: SC[o.status]?.bg, color: SC[o.status]?.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                  {SC[o.status]?.l}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
