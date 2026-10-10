import { Card, Btn } from '../ui';
import T from '../../theme';

// ─── OperatorListingTab ───
export function OperatorListingTab({ setEditOpen, warehouse }) {
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, fontSize: 12.5, marginBottom: 16 }}>
        {[
          ['Type', (warehouse.type || '').replace(/_/g, ' ')],
          ['Address', warehouse.address],
          ['Total Capacity', `${warehouse.totalCapacityTons} tons`],
          ['Base Price / Ton / Month', `₨${Number(warehouse.pricePerTonMonth).toLocaleString()}`],
          ['Min Duration', `${warehouse.minDurationDays} days`],
          ['Insurance Rate / Ton / Month', warehouse.insuranceAvailable
            ? (warehouse.insurancePricePerTonMonth != null ? `₨${Number(warehouse.insurancePricePerTonMonth).toLocaleString()}` : '⚠ Not set — depositors can\'t add insurance yet')
            : 'Not offered'],
          ['Status', warehouse.isActive ? 'Active — visible to buyers' : 'Delisted'],
          ['Verification', warehouse.isVerified ? '✅ Verified by AgriConnect' : '⏳ Not yet verified'],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ color: T.muted, fontSize: 10.5, fontWeight: 700, marginBottom: 3 }}>{label.toUpperCase()}</div>
            <div style={{ fontWeight: 600, color: T.text }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: T.muted, fontSize: 10.5, fontWeight: 700, marginBottom: 6 }}>COMMODITIES & RATES</div>
        {(warehouse.commoditiesAccepted || []).length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.muted }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(warehouse.commoditiesAccepted || []).map(c => {
              const rate = warehouse.ratesByCommodity?.[c];
              return (
                <span key={c} style={{ fontSize: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '4px 10px' }}>
                  {c} — ₨{rate != null ? Number(rate).toLocaleString() : Number(warehouse.pricePerTonMonth).toLocaleString()}{rate == null && <span style={{ color: T.muted }}> (base)</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <Btn variant="secondary" size="sm" onClick={() => setEditOpen(true)}>✏️ Edit Details</Btn>
    </Card>
  );
}
