import T from '../../theme';
import { inputStyle, labelStyle, COMMODITIES } from './shared';

export const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan'];

export const WAREHOUSE_TYPES = [
  ['DRY_STORAGE', 'Dry Storage'],
  ['COLD_STORAGE', 'Cold Storage'],
  ['CONTROLLED_ATMOSPHERE', 'Controlled Atmosphere'],
  ['BONDED', 'Bonded Warehouse'],
];

// Shared field set for both "register a new warehouse" and "edit my
// warehouse" — kept as one component so the two forms can't quietly drift
// apart (e.g. one getting insurance pricing and the other not).
export function WarehouseFormFields({ form, set, toggleCommodity }) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="warehouseformfields-f1" style={labelStyle}>WAREHOUSE NAME</label>
        <input id="warehouseformfields-f1" style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Punjab Cold Chain Hub" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="warehouseformfields-f2" style={labelStyle}>TYPE</label>
          <select id="warehouseformfields-f2" style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
            {WAREHOUSE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="warehouseformfields-f3" style={labelStyle}>PROVINCE</label>
          <select id="warehouseformfields-f3" style={inputStyle} value={form.province} onChange={e => set('province', e.target.value)}>
            {PROVINCES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="warehouseformfields-f4" style={labelStyle}>CITY</label>
          <input id="warehouseformfields-f4" style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Sheikhupura" />
        </div>
        <div>
          <label htmlFor="warehouseformfields-f5" style={labelStyle}>ADDRESS</label>
          <input id="warehouseformfields-f5" style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street / area" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="warehouseformfields-f6" style={labelStyle}>CAPACITY (TONS)</label>
          <input id="warehouseformfields-f6" type="number" min="1" style={inputStyle} value={form.totalCapacityTons} onChange={e => set('totalCapacityTons', e.target.value)} />
        </div>
        <div>
          <label htmlFor="warehouseformfields-f7" style={labelStyle}>BASE PRICE / TON / MONTH (₨)</label>
          <input id="warehouseformfields-f7" type="number" min="0" style={inputStyle} value={form.pricePerTonMonth} onChange={e => set('pricePerTonMonth', e.target.value)} />
        </div>
        <div>
          <label htmlFor="warehouseformfields-f8" style={labelStyle}>MIN DAYS</label>
          <input id="warehouseformfields-f8" type="number" min="1" style={inputStyle} value={form.minDurationDays} onChange={e => set('minDurationDays', e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={labelStyle}>COMMODITIES ACCEPTED</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COMMODITIES.map(c => (
            <button type="button" key={c} onClick={() => toggleCommodity(c)}
              style={{
                padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${form.commoditiesAccepted.includes(c) ? T.mid : T.border}`,
                background: form.commoditiesAccepted.includes(c) ? '#EFFDF5' : '#fff',
                color: form.commoditiesAccepted.includes(c) ? T.mid : T.muted,
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {form.commoditiesAccepted.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>PER-COMMODITY RATE OVERRIDES (₨/TON/MONTH, OPTIONAL)</div>
          <p style={{ fontSize: 11, color: T.muted, margin: '0 0 8px' }}>Leave blank to use the base price above for that commodity — some products (e.g. paddy vs. milled rice) store differently and may need their own rate.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 8 }}>
            {form.commoditiesAccepted.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: T.text, minWidth: 70 }}>{c}</span>
                <input
                  type="number" min="0" style={{ ...inputStyle, padding: '6px 10px' }}
                  placeholder={`Default ₨${form.pricePerTonMonth || 0}`}
                  value={form.ratesByCommodity[c] ?? ''}
                  onChange={e => set('ratesByCommodity', { ...form.ratesByCommodity, [c]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="warehouseformfields-f9" style={labelStyle}>DESCRIPTION (OPTIONAL)</label>
        <textarea id="warehouseformfields-f9" style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.text, marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.insuranceAvailable} onChange={e => set('insuranceAvailable', e.target.checked)} />
        Storage insurance available for depositors
      </label>
      {form.insuranceAvailable && (
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="warehouseformfields-f10" style={labelStyle}>INSURANCE RATE (₨/TON/MONTH)</label>
          <input id="warehouseformfields-f10"
            type="number" min="0" style={{ ...inputStyle, maxWidth: 220 }}
            value={form.insurancePricePerTonMonth}
            onChange={e => set('insurancePricePerTonMonth', e.target.value)}
            placeholder="e.g. 5"
          />
          <p style={{ fontSize: 11, color: T.muted, margin: '5px 0 0' }}>Depositors can only add insurance to a booking when a rate is set here. It is charged per ton per month, on top of storage.</p>
        </div>
      )}
    </>
  );
}
