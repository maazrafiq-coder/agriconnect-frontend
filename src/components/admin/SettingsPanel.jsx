import { useState } from 'react';
import AdminPricingPanel from './AdminPricingPanel';
import T from '../../theme';
import { CitiesPanel } from './CitiesPanel';
import { UnitsPanel } from './UnitsPanel';

// ─── SETTINGS PANEL ─────────────────────────────────────────────────────────
export function SettingsPanel() {
  const [tab, setTab] = useState('pricing');
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>⚙️ Platform Settings</h1>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 16px' }}>Platform fee, commodity prices, cities and units</p>

      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 20 }}>
        {[['pricing', '💰 Fee & Commodity Prices'], ['cities', '🏙️ Cities'], ['units', '📏 Units of Measurement']].map(([id, label]) => (
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

      {tab === 'pricing' && <AdminPricingPanel />}
      {tab === 'cities' && <CitiesPanel />}
      {tab === 'units' && <UnitsPanel />}
    </div>
  );
}
