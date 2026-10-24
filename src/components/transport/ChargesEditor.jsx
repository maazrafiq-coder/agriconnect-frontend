// Editable list of additional charges (loading, tolls, ...) with a live all-in total.
// Controlled: the parent owns `charges` ([{ label, amount }]) so Back from review keeps everything.
import T from '../../theme';
import { money } from '../../lib/paymentTerms';
import { chargesTotal, MAX_CHARGES } from './charges';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };

export default function ChargesEditor({ price, charges, onChange, idPrefix = 'chg' }) {
  const setRow = (i, patch) => onChange(charges.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const total = chargesTotal(price, charges);
  return (
    <fieldset style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', margin: '0 0 12px' }}>
      <legend style={{ fontSize: 11, fontWeight: 800, color: T.green, padding: '0 6px' }}>ADDITIONAL CHARGES (OPTIONAL)</legend>
      {charges.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label htmlFor={`${idPrefix}-l${i}`} style={lbl}>CHARGE {i + 1}</label>
            <input id={`${idPrefix}-l${i}`} style={input} value={c.label} maxLength={60} placeholder="e.g. Loading, tolls" onChange={e => setRow(i, { label: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor={`${idPrefix}-a${i}`} style={lbl}>AMOUNT (₨)</label>
            <input id={`${idPrefix}-a${i}`} type="number" min="0" style={input} value={c.amount} onChange={e => setRow(i, { amount: e.target.value })} />
          </div>
          <button type="button" aria-label={`Remove charge ${i + 1}`} onClick={() => onChange(charges.filter((_, j) => j !== i))}
            style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 7, padding: '8px 10px', cursor: 'pointer', color: T.muted }}>✕</button>
        </div>
      ))}
      <button type="button" disabled={charges.length >= MAX_CHARGES} onClick={() => onChange([...charges, { label: '', amount: '' }])}
        style={{ background: 'none', border: `1px dashed ${T.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: T.green }}>
        + Add a charge
      </button>
      <div data-testid="quote-total" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontWeight: 800, fontSize: 14 }}>
        <span>Total price (base + charges)</span><span>{money(total)}</span>
      </div>
    </fieldset>
  );
}
