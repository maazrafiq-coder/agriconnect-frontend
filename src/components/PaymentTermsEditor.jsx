// Controlled editor for payment terms. The parent owns the form state
// (see lib/paymentTerms.js blankTermsForm / validateTermsForm), so going Back
// from a review step never loses anything.
import T from '../theme';
import { TERM_TYPES, CREDIT_PRESETS, BALANCE_EVENTS } from '../lib/paymentTerms';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const label = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };

export default function PaymentTermsEditor({ value, onChange, idPrefix = 'pt', disabled = false }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const creditShown = value.type === 'CREDIT' || (value.type === 'PARTIAL_ADVANCE' && value.balanceDueEvent === 'CREDIT');
  const hint = TERM_TYPES.find(t => t.value === value.type)?.hint;

  return (
    <fieldset disabled={disabled} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', margin: '0 0 12px' }}>
      <legend style={{ fontSize: 11, fontWeight: 800, color: T.green, padding: '0 6px' }}>PAYMENT TERMS</legend>

      <label htmlFor={`${idPrefix}-type`} style={label}>HOW WILL THE BUYER PAY?</label>
      <select id={`${idPrefix}-type`} value={value.type} onChange={e => set({ type: e.target.value })} style={input}>
        {TERM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {hint && <div style={{ fontSize: 11, color: T.muted, margin: '5px 0 0' }}>{hint}</div>}

      {value.type === 'PARTIAL_ADVANCE' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 12 }}>
            <label><input type="radio" name={`${idPrefix}-advmode`} checked={value.advanceMode === 'PCT'} onChange={() => set({ advanceMode: 'PCT' })} /> Advance as a percentage</label>
            <label><input type="radio" name={`${idPrefix}-advmode`} checked={value.advanceMode === 'AMOUNT'} onChange={() => set({ advanceMode: 'AMOUNT' })} /> Advance as an amount</label>
          </div>
          {value.advanceMode === 'AMOUNT' ? (
            <>
              <label htmlFor={`${idPrefix}-advamt`} style={label}>ADVANCE AMOUNT (₨)</label>
              <input id={`${idPrefix}-advamt`} type="number" min="0" value={value.advanceAmount} onChange={e => set({ advanceAmount: e.target.value })} style={input} />
            </>
          ) : (
            <>
              <label htmlFor={`${idPrefix}-advpct`} style={label}>ADVANCE (% of the order total)</label>
              <input id={`${idPrefix}-advpct`} type="number" min="0" max="100" step="0.01" value={value.advancePct} onChange={e => set({ advancePct: e.target.value })} style={input} />
            </>
          )}
          <label htmlFor={`${idPrefix}-balance`} style={{ ...label, marginTop: 10 }}>BALANCE IS DUE</label>
          <select id={`${idPrefix}-balance`} value={value.balanceDueEvent} onChange={e => set({ balanceDueEvent: e.target.value })} style={input}>
            {BALANCE_EVENTS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      )}

      {creditShown && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor={`${idPrefix}-credit`} style={label}>CREDIT PERIOD</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select id={`${idPrefix}-credit`} value={value.creditPreset} onChange={e => set({ creditPreset: e.target.value })} style={{ ...input, width: 'auto', flex: '0 0 150px' }}>
              {CREDIT_PRESETS.map(d => <option key={d} value={d}>{d} days</option>)}
              <option value="custom">Custom…</option>
            </select>
            {value.creditPreset === 'custom' && (
              <input aria-label="Custom credit period in days" type="number" min="1" max="365" step="1" placeholder="1–365 days" value={value.creditCustom} onChange={e => set({ creditCustom: e.target.value })} style={{ ...input, width: 140 }} />
            )}
          </div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            <div style={{ ...label, marginBottom: 4 }}>THE PERIOD STARTS FROM</div>
            <label style={{ marginRight: 14 }}><input type="radio" name={`${idPrefix}-cstart`} checked={value.creditStart === 'DELIVERY_ACK'} onChange={() => set({ creditStart: 'DELIVERY_ACK' })} /> Delivery acknowledgement (default)</label>
            <label><input type="radio" name={`${idPrefix}-cstart`} checked={value.creditStart === 'INVOICE_DATE'} onChange={() => set({ creditStart: 'INVOICE_DATE' })} /> Invoice date</label>
          </div>
        </div>
      )}

      {value.type === 'OTHER' && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor={`${idPrefix}-desc`} style={label}>DESCRIBE THE ARRANGEMENT *</label>
          <textarea id={`${idPrefix}-desc`} rows={3} maxLength={500} value={value.description} onChange={e => set({ description: e.target.value })} placeholder="e.g. Letter of credit at sight, 40% on loading, 60% against documents" style={{ ...input, resize: 'vertical' }} />
        </div>
      )}
    </fieldset>
  );
}
