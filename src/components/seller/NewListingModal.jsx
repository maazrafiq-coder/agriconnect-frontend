import { useState, useEffect, useRef } from 'react';
import { apiCreateProduct, apiUpdateProduct, apiGetCategories, apiGetCities, apiGetUnits } from '../../lib/api';
import RequestFlowModal from '../ui/RequestFlowModal';
import PaymentTermsEditor from '../PaymentTermsEditor';
import PaymentTermsView from '../PaymentTermsView';
import { blankTermsForm, formFromTerms, termsFromForm, validateTermsForm, describeTerms, money } from '../../lib/paymentTerms';
import T from '../../theme';

// ─── NEW LISTING MODAL ─────────────────────────────────────────────────────────
export const RICE_STAGES = ['PADDY', 'BROWN_RICE', 'MILLED_WHITE', 'WHITE_RICE', 'PARBOILED'];

export function NewListingModal({ onClose, onCreated, listing, onSaved }) {
  const raw = listing?._raw;
  const editing = !!raw;
  const rd = raw?.riceDetails || {};
  const num = (v) => (v === null || v === undefined ? '' : String(v));
  const [form, setForm] = useState(editing ? {
    category: raw.category, name: raw.name || '', description: raw.description || '',
    quantity: num(raw.quantity), unit: raw.unit || '', askingPrice: num(raw.askingPrice), minOrderQty: num(raw.minOrderQty),
    locationCity: raw.locationCity || '', locationProvince: raw.locationProvince || 'Punjab',
    harvestDate: raw.harvestDate ? String(raw.harvestDate).slice(0, 10) : '',
    packagingType: raw.packagingType || '', deliveryTerms: raw.deliveryTerms || '',
    stage: rd.stage || 'MILLED_WHITE', variety: rd.variety || '', moisturePct: num(rd.moisturePct),
    grainLengthMm: num(rd.grainLengthMm), brokenPct: num(rd.brokenPct), purityPct: num(rd.purityPct),
  } : {
    category: 'rice', name: '', description: '', quantity: '', unit: '40kg bags',
    askingPrice: '', minOrderQty: '', locationCity: '', locationProvince: 'Punjab',
    harvestDate: '', packagingType: '', deliveryTerms: '',
    // Rice-specific (optional, only sent if category is RICE)
    stage: 'MILLED_WHITE', variety: '', moisturePct: '', grainLengthMm: '', brokenPct: '', purityPct: '',
  });
  const hadTerms = !!raw?.paymentTerms;
  const [termsOn, setTermsOn] = useState(hadTerms);
  const [terms, setTerms] = useState(hadTerms ? formFromTerms(raw.paymentTerms) : blankTermsForm());
  const [categories, setCategories] = useState([
    { slug: 'rice', name: 'Rice', icon: '🌾' }, { slug: 'paddy', name: 'Paddy', icon: '🌾' },
    { slug: 'wheat', name: 'Wheat', icon: '🌿' }, { slug: 'maize', name: 'Maize', icon: '🌽' },
    { slug: 'pulses', name: 'Pulses', icon: '🫘' }, { slug: 'oil-seeds', name: 'Oil Seeds', icon: '🛢️' },
  ]); // instant fallback; replaced once the real admin-managed list loads
  const [cities, setCities] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    apiGetCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    apiGetCities().then(setCities).catch(() => setCities([]));
  }, []);

  // Units depend on which category is currently selected — re-fetch whenever
  // it changes so e.g. picking "Cotton" surfaces "Bales" in the dropdown.
  useEffect(() => {
    apiGetUnits(form.category).then(list => {
      setUnits(list);
      // If the previously-selected unit isn't valid for the new category, clear it
      if (!editing && form.unit && !list.some(u => u.name === form.unit)) {
        set('unit', '');
      }
    }).catch(() => setUnits([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };

  const validate = () => {
    if (!form.name || !form.quantity || !form.askingPrice || !form.minOrderQty || !form.locationCity) {
      return 'Please fill in all required fields: name, quantity, price, min. order, and location';
    }
    return termsOn ? validateTermsForm(terms) : null;
  };

  const buildPayload = () => ({
    ...(!editing && { category: form.category, unit: form.unit }), // fixed once created
    name: form.name,
    description: form.description || undefined,
    quantity: Number(form.quantity),
    askingPrice: Number(form.askingPrice),
    minOrderQty: Number(form.minOrderQty),
    locationCity: form.locationCity,
    locationProvince: form.locationProvince,
    harvestDate: form.harvestDate || undefined,
    packagingType: form.packagingType || undefined,
    deliveryTerms: form.deliveryTerms || undefined,
    ...(termsOn ? { paymentTerms: termsFromForm(terms) } : {}),
    ...(form.category === 'rice' && form.variety ? {
      riceDetails: {
        stage: form.stage,
        variety: form.variety,
        moisturePct: form.moisturePct ? Number(form.moisturePct) : undefined,
        grainLengthMm: form.grainLengthMm ? Number(form.grainLengthMm) : undefined,
        brokenPct: form.brokenPct ? Number(form.brokenPct) : undefined,
        purityPct: form.purityPct ? Number(form.purityPct) : undefined,
      },
    } : {}),
  });

  // The parent's onCreated/onSaved closes this modal, so hold the result until the
  // person dismisses the success screen (Done or the X), then hand it over once.
  const saved = useRef(null);
  const onSubmit = async () => {
    const res = await (editing ? apiUpdateProduct(raw.id, buildPayload()) : apiCreateProduct(buildPayload()));
    saved.current = res ?? {};
    return res;
  };
  const dismiss = () => {
    if (saved.current) { const r = saved.current; saved.current = null; (editing ? onSaved(r) : onCreated(r)); }
    else onClose();
  };

  const review = (
    <>
      <div style={{ background: T.surface, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
        <div><strong>{form.name}</strong> · {form.category}</div>
        <div>{form.quantity} {form.unit} at {money(form.askingPrice)} per unit · min order {form.minOrderQty}</div>
        <div style={{ color: T.muted }}>{form.locationCity}, {form.locationProvince}</div>
      </div>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px' }}>
        {termsOn ? <PaymentTermsView terms={termsFromForm(terms)} total={Number(form.askingPrice) * Number(form.minOrderQty)} /> : <span style={{ color: T.muted }}>No payment terms set - each buyer proposes their own.</span>}
      </div>
    </>
  );

  return (
    <RequestFlowModal
      title={editing ? `Edit Listing — ${raw.name}` : 'Create New Listing'}
      stepLabels={['Details', 'Review', editing ? 'Saved' : 'Created']}
      form={<>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="newlistingmodal-f1" style={labelStyle}>CATEGORY</label>
          <select id="newlistingmodal-f1" value={form.category} onChange={e => set('category', e.target.value)} disabled={editing} style={inputStyle}>
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="newlistingmodal-f2" style={labelStyle}>PRODUCT NAME *</label>
          <input id="newlistingmodal-f2" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. 1121 Basmati — Milled White" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="newlistingmodal-f3" style={labelStyle}>DESCRIPTION</label>
        <textarea id="newlistingmodal-f3" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Describe quality, certifications, export suitability..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="newlistingmodal-f4" style={labelStyle}>QUANTITY *</label>
          <input id="newlistingmodal-f4" value={form.quantity} onChange={e => set('quantity', e.target.value)} type="number" placeholder="500" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="newlistingmodal-f5" style={labelStyle}>UNIT</label>
          <select id="newlistingmodal-f5" value={form.unit} onChange={e => set('unit', e.target.value)} disabled={editing} style={inputStyle}>
            <option value="">— Select unit —</option>
            {editing && form.unit && !units.some(u => u.name === form.unit) && <option value={form.unit}>{form.unit}</option>}
            {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="newlistingmodal-f6" style={labelStyle}>MIN. ORDER *</label>
          <input id="newlistingmodal-f6" value={form.minOrderQty} onChange={e => set('minOrderQty', e.target.value)} type="number" placeholder="50" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="newlistingmodal-f7" style={labelStyle}>ASKING PRICE (₨) *</label>
        <input id="newlistingmodal-f7" value={form.askingPrice} onChange={e => set('askingPrice', e.target.value)} type="number" placeholder="3800" style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="newlistingmodal-f8" style={labelStyle}>CITY *</label>
          <select id="newlistingmodal-f8" value={form.locationCity} onChange={e => set('locationCity', e.target.value)} style={inputStyle}>
            <option value="">— Select city —</option>
            {cities.filter(c => c.province === form.locationProvince).map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="newlistingmodal-f9" style={labelStyle}>PROVINCE</label>
          <select id="newlistingmodal-f9" value={form.locationProvince} onChange={e => { set('locationProvince', e.target.value); set('locationCity', ''); }} style={inputStyle}>
            {['Punjab', 'Sindh', 'KPK', 'Balochistan'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 16 }}>
        <div>
          <label htmlFor="newlistingmodal-f10" style={labelStyle}>HARVEST DATE</label>
          <input id="newlistingmodal-f10" value={form.harvestDate} onChange={e => set('harvestDate', e.target.value)} type="date" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="newlistingmodal-f11" style={labelStyle}>PACKAGING TYPE</label>
          <input id="newlistingmodal-f11" value={form.packagingType} onChange={e => set('packagingType', e.target.value)} placeholder="Woven PP Bags" style={inputStyle} />
        </div>
      </div>

      {form.category === 'rice' && (
        <div style={{ background: T.surface, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 10 }}>🌾 Rice Quality Details (optional but recommended)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 10 }}>
            <div>
              <label htmlFor="newlistingmodal-f12" style={labelStyle}>MILLING STAGE</label>
              <select id="newlistingmodal-f12" value={form.stage} onChange={e => set('stage', e.target.value)} style={inputStyle}>
                {RICE_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="newlistingmodal-f13" style={labelStyle}>VARIETY</label>
              <input id="newlistingmodal-f13" value={form.variety} onChange={e => set('variety', e.target.value)} placeholder="1121 Basmati" style={inputStyle} />
            </div>
          </div>
          <div className="ac-grid-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {[['Moisture %', 'moisturePct'], ['Grain Length (mm)', 'grainLengthMm'], ['Broken %', 'brokenPct'], ['Purity %', 'purityPct']].map(([label, key]) => (
              <div key={key}>
                <label htmlFor="newlistingmodal-f14" style={{ ...labelStyle, fontSize: 10 }}>{label}</label>
                <input id="newlistingmodal-f14" value={form[key]} onChange={e => set(key, e.target.value)} type="number" step="0.1" style={{ ...inputStyle, padding: '7px 9px' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 700, cursor: hadTerms ? 'default' : 'pointer' }}>
          <input type="checkbox" checked={termsOn} disabled={hadTerms} onChange={e => setTermsOn(e.target.checked)} />
          Set payment terms for this listing
        </label>
        <div style={{ fontSize: 11, color: T.muted, margin: '4px 0 0' }}>Buyers see these and can propose different terms in their offer. Leave off to let each buyer propose.</div>
        {termsOn && <div style={{ marginTop: 10 }}><PaymentTermsEditor value={terms} onChange={setTerms} idPrefix="listing-terms" /></div>}
      </div>

      {editing && raw.status === 'REJECTED' && (
        <div style={{ fontSize: 12, color: '#B45309', background: '#FEF3C7', padding: '8px 12px', borderRadius: 7, marginBottom: 14 }}>
          Saving a rejected listing sends it back to admin review.
        </div>
      )}
      {editing && <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>Category and unit can't be changed after a listing is created.</div>}
      </>}
      validate={validate}
      review={review}
      reviewTitle={editing ? 'Review your changes' : 'Review your listing'}
      reviewNotice={editing && raw.status === 'REJECTED' ? 'Saving a rejected listing sends it back to admin review.' : 'New and changed listings may need admin approval before buyers see them.'}
      confirmLabel={editing ? 'Save changes' : 'Create listing'}
      confirmingLabel={editing ? 'Saving…' : 'Creating…'}
      onSubmit={onSubmit}
      success={() => ({ icon: '✅', title: editing ? 'Listing saved' : 'Listing created', message: editing ? 'Your changes were saved.' : 'Your listing was created.', rows: [{ label: 'Payment terms', value: termsOn ? describeTerms(termsFromForm(terms)) : 'Not set' }] })}
      onDone={dismiss}
      onClose={dismiss}
    />
  );
}
