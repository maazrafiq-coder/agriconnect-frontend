import { useState, useEffect } from 'react';
import { apiAdminGetSettings, apiAdminSetPlatformFee, apiAdminSetCommodityPrice, apiAdminDeleteCommodityPrice } from '../../lib/api';
import { Card, Btn } from '../ui';
import T from '../../theme';

const fieldStyle = { padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

export default function AdminPricingPanel() {
  const [fee, setFee] = useState('');
  const [prices, setPrices] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const s = await apiAdminGetSettings();
      setFee(String(s.platformFeePct)); setPrices(s.commodityPrices || []);
    } catch (e) { setMsg({ ok: false, text: e?.message || 'Failed to load settings' }); }
  };
  useEffect(() => { load(); }, []);

  const run = async (fn, okText) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg({ ok: true, text: typeof okText === 'function' ? okText(r) : okText }); await load(); return true; }
    catch (e) { setMsg({ ok: false, text: e?.message || 'Failed' }); return false; }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, color: T.green }}>Platform fee</h3>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 12px' }}>Percentage kept on each order. A change applies to <strong>new</strong> orders only; existing orders keep the fee they were accepted at.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="number" step="0.1" min="0" max="25" value={fee} onChange={e => setFee(e.target.value)} style={{ ...fieldStyle, width: 110 }} />
          <span style={{ fontSize: 13 }}>%</span>
          <Btn size="sm" disabled={busy || fee === ''} onClick={() => run(() => apiAdminSetPlatformFee(Number(fee)), 'Platform fee updated.')}>Save</Btn>
        </div>
      </Card>

      <Card style={{ padding: 18 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, color: T.green }}>Commodity prices (PKR per ton)</h3>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
          Used to value warehouse receipts (and cap loans at 70%). With no price set, new receipts are "valuation pending" and cannot be used for loans. Setting a price also values receipts that were waiting for it. Name must match the commodity on the booking (e.g. "Rice").
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input placeholder="Commodity" value={name} onChange={e => setName(e.target.value)} style={{ ...fieldStyle, flex: '1 1 160px' }} />
          <input type="number" placeholder="PKR / ton" value={price} onChange={e => setPrice(e.target.value)} style={{ ...fieldStyle, flex: '1 1 130px' }} />
          <Btn size="sm" disabled={busy || !name.trim() || !price} onClick={async () => {
            const ok = await run(() => apiAdminSetCommodityPrice(name.trim(), Number(price)), r => `Saved.${r?.receiptsValued ? ` ${r.receiptsValued} waiting receipt(s) valued.` : ''}`);
            if (ok) { setName(''); setPrice(''); }
          }}>Set price</Btn>
        </div>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {prices.map(p => (
              <tr key={p.commodity} style={{ borderTop: `1px solid ${T.border}` }}>
                <td style={{ padding: '8px 4px', fontWeight: 600 }}>{p.label}</td>
                <td style={{ padding: '8px 4px' }}>₨{Number(p.pricePerTon).toLocaleString()} / ton</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Btn variant="ghost" size="sm" disabled={busy} onClick={() => { setName(p.label); setPrice(String(Number(p.pricePerTon))); }}>Edit</Btn>{' '}
                  <Btn variant="danger" size="sm" disabled={busy} onClick={() => window.confirm(`Remove the price for ${p.label}?`) && run(() => apiAdminDeleteCommodityPrice(p.commodity), 'Price removed.')}>Remove</Btn>
                </td>
              </tr>
            ))}
            {prices.length === 0 && <tr><td style={{ padding: 12, color: T.muted }}>No prices set yet.</td></tr>}
          </tbody>
        </table></div>
      </Card>
      {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.ok ? '#15803D' : T.danger }}>{msg.text}</div>}
    </div>
  );
}
