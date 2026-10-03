import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetWarehouseDashboard, apiRegisterWarehouse, apiUpdateWarehouse, apiIssueReceipt,
  apiAcceptBooking, apiRejectBooking, apiCompleteBooking,
  apiGenerateInvoice, apiConfirmInvoicePayment, apiGetInvoice, apiGetGrn,
  apiRequestGateOut, apiGetGateOutPass,
  apiGetMyProviderClarifications, apiRespondToClarification,
} from '../lib/api';
import { Card, Btn, Tabs, Modal } from '../components/ui';
import { STATUS_COLORS } from '../data';
import MediaManagerModal from '../components/MediaManager';
import ClarificationThread from '../components/ClarificationThread';
import BookingThread from '../components/BookingThread';
import T from '../theme';

const inputStyle = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`,
  borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, display: 'block', letterSpacing: '0.3px' };
const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan'];
const WAREHOUSE_TYPES = [
  ['DRY_STORAGE', 'Dry Storage'],
  ['COLD_STORAGE', 'Cold Storage'],
  ['CONTROLLED_ATMOSPHERE', 'Controlled Atmosphere'],
  ['BONDED', 'Bonded Warehouse'],
];
const COMMODITIES = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Pulses'];

// Shared field set for both "register a new warehouse" and "edit my
// warehouse" — kept as one component so the two forms can't quietly drift
// apart (e.g. one getting insurance pricing and the other not).
function WarehouseFormFields({ form, set, toggleCommodity }) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>WAREHOUSE NAME</label>
        <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Punjab Cold Chain Hub" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>TYPE</label>
          <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
            {WAREHOUSE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PROVINCE</label>
          <select style={inputStyle} value={form.province} onChange={e => set('province', e.target.value)}>
            {PROVINCES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CITY</label>
          <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Sheikhupura" />
        </div>
        <div>
          <label style={labelStyle}>ADDRESS</label>
          <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street / area" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CAPACITY (TONS)</label>
          <input type="number" min="1" style={inputStyle} value={form.totalCapacityTons} onChange={e => set('totalCapacityTons', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>BASE PRICE / TON / MONTH (₨)</label>
          <input type="number" min="0" style={inputStyle} value={form.pricePerTonMonth} onChange={e => set('pricePerTonMonth', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>MIN DAYS</label>
          <input type="number" min="1" style={inputStyle} value={form.minDurationDays} onChange={e => set('minDurationDays', e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>COMMODITIES ACCEPTED</label>
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
          <label style={labelStyle}>PER-COMMODITY RATE OVERRIDES (₨/TON/MONTH, OPTIONAL)</label>
          <p style={{ fontSize: 11, color: T.muted, margin: '0 0 8px' }}>Leave blank to use the base price above for that commodity — some products (e.g. paddy vs. milled rice) store differently and may need their own rate.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
        <label style={labelStyle}>DESCRIPTION (OPTIONAL)</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.text, marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.insuranceAvailable} onChange={e => set('insuranceAvailable', e.target.checked)} />
        Storage insurance available for depositors
      </label>
      {form.insuranceAvailable && (
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>INSURANCE RATE (₨/TON/MONTH)</label>
          <input
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

// ─── REGISTER FORM (shown when no warehouse profile exists yet) ────────────
function RegisterWarehouseForm({ onRegistered }) {
  const [form, setForm] = useState({
    name: '', type: 'DRY_STORAGE', city: '', province: 'Punjab', address: '',
    totalCapacityTons: '', pricePerTonMonth: '', minDurationDays: '30',
    commoditiesAccepted: [], ratesByCommodity: {}, insuranceAvailable: false,
    insurancePricePerTonMonth: '', description: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCommodity = (c) => {
    setForm(f => ({
      ...f,
      commoditiesAccepted: f.commoditiesAccepted.includes(c)
        ? f.commoditiesAccepted.filter(x => x !== c)
        : [...f.commoditiesAccepted, c],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.city || !form.address) return setError('Name, city, and address are required.');
    if (!form.commoditiesAccepted.length) return setError('Select at least one commodity you accept.');
    if (!form.totalCapacityTons || !form.pricePerTonMonth) return setError('Capacity and price are required.');
    if (form.insuranceAvailable && form.insurancePricePerTonMonth === '') return setError('Enter an insurance rate, or untick "Storage insurance available".');

    setBusy(true);
    try {
      const ratesByCommodity = Object.fromEntries(
        Object.entries(form.ratesByCommodity).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)])
      );
      await apiRegisterWarehouse({
        ...form,
        totalCapacityTons: Number(form.totalCapacityTons),
        pricePerTonMonth: Number(form.pricePerTonMonth),
        minDurationDays: Number(form.minDurationDays),
        ratesByCommodity,
        insurancePricePerTonMonth: form.insuranceAvailable && form.insurancePricePerTonMonth !== ''
          ? Number(form.insurancePricePerTonMonth) : undefined,
      });
      onRegistered();
    } catch (err) {
      setError(err.message || 'Could not register your warehouse.');
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 560, margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: T.green }}>List Your Warehouse</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12.5, color: T.muted }}>
        Set up your storage facility once — buyers will be able to find and book it from the marketplace.
      </p>
      <form onSubmit={submit}>
        <WarehouseFormFields form={form} set={set} toggleCommodity={toggleCommodity} />
        {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <Btn variant="primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Registering…' : 'Register Warehouse'}</Btn>
      </form>
    </Card>
  );
}

// ─── EDIT WAREHOUSE MODAL (NEW_Changes item 10 — there was previously no
// way to change anything after registration) ────────────────────────────────
function EditWarehouseModal({ warehouse, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: warehouse.name || '', type: warehouse.type || 'DRY_STORAGE',
    city: warehouse.city || '', province: warehouse.province || 'Punjab', address: warehouse.address || '',
    totalCapacityTons: String(warehouse.totalCapacityTons ?? ''),
    pricePerTonMonth: String(warehouse.pricePerTonMonth ?? ''),
    minDurationDays: String(warehouse.minDurationDays ?? ''),
    commoditiesAccepted: warehouse.commoditiesAccepted || [],
    ratesByCommodity: Object.fromEntries(Object.entries(warehouse.ratesByCommodity || {}).map(([k, v]) => [k, String(v)])),
    insuranceAvailable: !!warehouse.insuranceAvailable,
    insurancePricePerTonMonth: warehouse.insurancePricePerTonMonth != null ? String(warehouse.insurancePricePerTonMonth) : '',
    description: warehouse.description || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCommodity = (c) => {
    setForm(f => ({
      ...f,
      commoditiesAccepted: f.commoditiesAccepted.includes(c)
        ? f.commoditiesAccepted.filter(x => x !== c)
        : [...f.commoditiesAccepted, c],
    }));
  };

  const submit = async () => {
    setError('');
    if (!form.name || !form.city || !form.address) return setError('Name, city, and address are required.');
    if (!form.commoditiesAccepted.length) return setError('Select at least one commodity you accept.');
    if (form.insuranceAvailable && form.insurancePricePerTonMonth === '') return setError('Enter an insurance rate, or untick "Storage insurance available".');
    setBusy(true);
    try {
      const ratesByCommodity = Object.fromEntries(
        Object.entries(form.ratesByCommodity).filter(([k, v]) => form.commoditiesAccepted.includes(k) && v !== '' && v != null).map(([k, v]) => [k, Number(v)])
      );
      await apiUpdateWarehouse(warehouse.id, {
        ...form,
        totalCapacityTons: Number(form.totalCapacityTons),
        pricePerTonMonth: Number(form.pricePerTonMonth),
        minDurationDays: Number(form.minDurationDays),
        ratesByCommodity,
        insurancePricePerTonMonth: form.insuranceAvailable && form.insurancePricePerTonMonth !== ''
          ? Number(form.insurancePricePerTonMonth) : null,
      });
      onSaved();
    } catch (err) {
      setError(err.message || 'Could not save changes.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit Warehouse Details" onClose={onClose} width={640}>
      <WarehouseFormFields form={form} set={set} toggleCommodity={toggleCommodity} />
      {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={busy} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save Changes'}</Btn>
      </div>
    </Modal>
  );
}

// ─── REJECT BOOKING MODAL ────────────────────────────────────────────────────
function RejectBookingModal({ booking, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!reason.trim()) return setError('Please provide a reason so the depositor understands why.');
    setBusy(true);
    try {
      await apiRejectBooking(booking.id, reason.trim());
      onRejected();
    } catch (err) {
      setError(err.message || 'Could not reject this booking.');
      setBusy(false);
    }
  };

  return (
    <Modal title={`Decline Booking — ${booking.bookingReference || ''}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 14px', lineHeight: 1.6 }}>
        Let {booking.depositor?.profile?.fullName || 'the depositor'} know why you can't accept this booking for {booking.commodity}.
      </p>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>REASON</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. No capacity available for this commodity right now"
        />
      </div>
      {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="danger" onClick={submit} disabled={busy} style={{ flex: 1 }}>{busy ? 'Declining…' : 'Decline Booking'}</Btn>
      </div>
    </Modal>
  );
}

// ─── ISSUE RECEIPT MODAL ────────────────────────────────────────────────────
function IssueReceiptModal({ booking, onClose, onIssued }) {
  const [actualQuantityTons, setQty] = useState(booking.quantityTons || '');
  const [moisture, setMoisture] = useState('');
  const [purity, setPurity] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!actualQuantityTons) return setError('Enter the actual stored quantity.');
    setBusy(true);
    try {
      const qualityMetrics = {};
      if (moisture) qualityMetrics.moisture = Number(moisture);
      if (purity) qualityMetrics.purity = Number(purity);
      await apiIssueReceipt(booking.id, { actualQuantityTons: Number(actualQuantityTons), qualityMetrics });
      onIssued();
    } catch (err) {
      setError(err.message || 'Could not issue receipt.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Issue Digital Warehouse Receipt" onClose={onClose}>
      <p style={{ fontSize: 12.5, color: T.muted, marginBottom: 16 }}>
        For {booking.depositor?.profile?.fullName || 'depositor'} — {booking.commodity}
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>ACTUAL QUANTITY STORED (TONS)</label>
        <input type="number" min="0.1" step="0.1" style={inputStyle} value={actualQuantityTons} onChange={e => setQty(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>MOISTURE % (OPTIONAL)</label>
          <input type="number" step="0.1" style={inputStyle} value={moisture} onChange={e => setMoisture(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>PURITY % (OPTIONAL)</label>
          <input type="number" step="0.1" style={inputStyle} value={purity} onChange={e => setPurity(e.target.value)} />
        </div>
      </div>
      {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={busy} style={{ flex: 1 }}>{busy ? 'Issuing…' : 'Issue Receipt'}</Btn>
      </div>
    </Modal>
  );
}

// ─── BOOKING DETAIL MODAL — everything the operator needs to decide on a
// booking, plus the conversation thread (incl. "request more information") ──
function BookingDetailModal({ booking, onClose, onAccept, onDecline }) {
  const d = booking.depositor || {};
  const prof = d.profile || {};
  const fmt = (v) => v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const insured = !!booking.includeInsurance;
  const rows = [
    ['Reference', booking.bookingReference],
    ['Status', booking.status],
    ['Commodity', `${booking.commodity}${booking.variety ? ` · ${booking.variety}` : ''}`],
    ['Quantity', `${booking.quantityTons} tons`],
    ['Packaging', booking.packagingType || 'Not specified'],
    ['Entry date', fmt(booking.entryDate)],
    ['Exit date', fmt(booking.exitDate)],
    ['Duration', `${booking.durationDays} days`],
    ['Rate / ton / month', booking.pricePerTon != null ? `₨${Number(booking.pricePerTon).toLocaleString()}` : '—'],
    ['Insurance', insured ? `Yes — ₨${Number(booking.insuranceCost || 0).toLocaleString()}` : 'No'],
    ['Total cost', `₨${Number(booking.totalCost).toLocaleString()}`],
    ['Requested on', fmt(booking.createdAt)],
  ];
  const requester = [
    ['Name', prof.fullName || '—'],
    ['Business', prof.businessName || '—'],
    ['Phone', d.phoneNumber || '—'],
    ['Email', d.email || '—'],
    ['Location', [prof.city, prof.province].filter(Boolean).join(', ') || '—'],
    ['KYC', d.kycStatus || '—'],
  ];
  const Grid = ({ items }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', fontSize: 12.5 }}>
      {items.map(([l, v]) => (
        <div key={l}>
          <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{l.toUpperCase()}</div>
          <div style={{ fontWeight: 600, color: T.text, wordBreak: 'break-word' }}>{v}</div>
        </div>
      ))}
    </div>
  );
  const status = (booking.status || '').toLowerCase();
  return (
    <Modal title={`Booking ${booking.bookingReference || ''}`} onClose={onClose} width={640}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, margin: '0 0 8px' }}>BOOKING</div>
      <Grid items={rows} />
      {booking.notes && (
        <div style={{ marginTop: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}>
          <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>NOTES FROM DEPOSITOR</div>
          {booking.notes}
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, margin: '16px 0 8px' }}>REQUESTER</div>
      <Grid items={requester} />
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, margin: '16px 0 8px' }}>CONVERSATION</div>
      <BookingThread bookingId={booking.id} isOperator closed={['rejected', 'cancelled'].includes(status)} />
      {status === 'requested' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => onDecline(booking)} style={{ flex: 1 }}>Decline</Btn>
          <Btn variant="primary" onClick={() => onAccept(booking)} style={{ flex: 1 }}>Accept booking</Btn>
        </div>
      )}
    </Modal>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function WarehouseOperatorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [rejectBooking, setRejectBooking] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [addingAnother, setAddingAnother] = useState(false);
  const [clarifications, setClarifications] = useState([]);
  const [detailBooking, setDetailBooking] = useState(null);

  const loadClarifications = () => {
    apiGetMyProviderClarifications('WAREHOUSE_PROFILE')
      .then(d => setClarifications(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const handleRespondToClarification = async (id, message, files) => {
    await apiRespondToClarification(id, message, files);
    loadClarifications();
  };

  const load = (warehouseId) => {
    setLoading(true);
    apiGetWarehouseDashboard(warehouseId || selectedWarehouseId || undefined)
      .then(d => { setData(d); setSelectedWarehouseId(d.warehouse.id); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  // Switching which of the operator's warehouses is shown (NEW_Changes
  // item 10 — an operator can now run more than one). Passes the id
  // straight through rather than relying on state + a useEffect
  // dependency, so switching doesn't cost an extra redundant fetch.
  const switchWarehouse = (id) => load(id);

  useEffect(() => load(), []);
  useEffect(loadClarifications, []);

  const handleAccept = async (booking) => {
    setActionError('');
    setActioningId(booking.id);
    try {
      await apiAcceptBooking(booking.id);
      load();
    } catch (err) {
      setActionError(err.message || 'Could not accept this booking.');
    } finally {
      setActioningId(null);
    }
  };

  const handleComplete = async (booking) => {
    setActionError('');
    setActioningId(booking.id);
    try {
      await apiCompleteBooking(booking.id);
      load();
    } catch (err) {
      setActionError(err.message || 'Could not mark this booking complete.');
    } finally {
      setActioningId(null);
    }
  };

  // Generic wrapper for the document actions below — same busy/error
  // handling as accept/complete, then refresh so the row shows new state.
  const runDocAction = async (booking, fn, fallbackMsg) => {
    setActionError('');
    setActioningId(booking.id);
    try {
      await fn();
      load();
    } catch (err) {
      setActionError(err.message || fallbackMsg);
    } finally {
      setActioningId(null);
    }
  };

  const handleGenerateInvoice = (b) => runDocAction(b, () => apiGenerateInvoice(b.id), 'Could not generate the invoice.');
  const handleConfirmPayment = (b) => {
    const ref = window.prompt('Payment reference (bank transfer ID, cheque no., etc. — optional):', '');
    if (ref === null) return; // cancelled
    return runDocAction(b, () => apiConfirmInvoicePayment(b.invoice.id, ref || undefined), 'Could not confirm payment.');
  };
  const handleRequestGateOut = (b) => {
    if (!window.confirm('Request gate-out approval from the depositor for the full stored quantity?')) return;
    return runDocAction(b, () => apiRequestGateOut(b.id), 'Could not request gate-out.');
  };

  // Documents are private — fetch a fresh short-lived signed URL right
  // when the operator clicks, then open it, rather than keeping a
  // long-lived link in the page.
  const openDoc = async (fetcher, id) => {
    setActionError('');
    try {
      const doc = await fetcher(id);
      if (doc.downloadUrl) window.open(doc.downloadUrl, '_blank', 'noopener');
      else setActionError('This document has not been issued yet.');
    } catch (err) {
      setActionError(err.message || 'Could not open the document.');
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: T.muted, fontFamily: 'Inter,sans-serif' }}>Loading your warehouse dashboard…</div>;
  }

  if (notFound || !data) {
    return (
      <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh', padding: '48px 20px' }}>
        <RegisterWarehouseForm onRegistered={load} />
      </div>
    );
  }

  const { warehouse, stats, recentBookings, warehouses = [] } = data;

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh' }}>
      <div style={{ background: `linear-gradient(135deg,${T.green} 0%,${T.mid} 60%,${T.green} 100%)`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🏭</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.bg }}>{warehouse.name}</h1>
              <p style={{ margin: '3px 0 0', color: T.mint, fontSize: 13 }}>{warehouse.city}, {warehouse.province} · {warehouse.isVerified ? '✓ Verified' : 'Pending verification'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="gold" size="sm" onClick={() => setMediaOpen(true)}>📷 Photos & Documents</Btn>
            <Btn variant="secondary" size="sm" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => setEditOpen(true)}>✏️ Edit Details</Btn>
            <Btn variant="secondary" size="sm" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => navigate(`/warehouse`)}>View Public Listing</Btn>
          </div>
        </div>

        {/* Warehouse picker — an operator can run more than one warehouse
            (NEW_Changes item 10), so switch between them here. */}
        {(
          <div style={{ maxWidth: 1000, margin: '18px auto 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {warehouses.map(w => (
              <button key={w.id} onClick={() => switchWarehouse(w.id)}
                style={{
                  padding: '6px 14px', borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${w.id === warehouse.id ? '#fff' : 'rgba(255,255,255,0.4)'}`,
                  background: w.id === warehouse.id ? '#fff' : 'transparent',
                  color: w.id === warehouse.id ? T.green : '#fff',
                }}>
                {w.name} · {w.city}
              </button>
            ))}
            <button onClick={() => setAddingAnother(true)}
              style={{ padding: '6px 14px', borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: '1.5px dashed rgba(255,255,255,0.6)', background: 'transparent', color: '#fff' }}>
              + Add Another Warehouse
            </button>
          </div>
        )}
      </div>


      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            ['Total Bookings', stats.totalBookings],
            ['Active Receipts', stats.activeReceipts],
            ['Used Capacity', `${stats.usedCapacityTons.toLocaleString()}t`],
            ['Available', `${stats.availableCapacityTons.toLocaleString()}t`],
            ['Revenue', `₨${Number(stats.totalRevenue).toLocaleString()}`],
          ].map(([label, val]) => (
            <Card key={label} style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.green }}>{val}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
            </Card>
          ))}
        </div>

        <Tabs
          tabs={[
            ['overview', '📋 Bookings'],
            ['listing', '🏭 Listing Details'],
            ['review', `🔍 Listing Review${clarifications.filter(c => c.status === 'OPEN').length ? ` (${clarifications.filter(c => c.status === 'OPEN').length})` : ''}`],
          ]}
          active={tab} onChange={setTab}
        />

        {tab === 'overview' && (
          recentBookings.length === 0 ? (
            <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No bookings yet — they'll show up here once a depositor books storage.</p></Card>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {actionError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#B91C1C' }}>⚠ {actionError}</div>
              )}
              {recentBookings.map(b => {
                const status = (b.status || 'requested').toLowerCase();
                const sc = STATUS_COLORS[status] || { bg: '#F3F4F6', c: '#6B7280', l: b.status };
                const busy = actioningId === b.id;
                return (
                  <Card key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: T.muted, letterSpacing: 0.3 }}>{b.bookingReference}</span>
                        <span style={{ background: sc.bg, color: sc.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{sc.l}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {b.commodity} {b.variety ? `· ${b.variety}` : ''} — {b.quantityTons} tons
                      </div>
                      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                        {b.depositor?.profile?.fullName || 'Depositor'} · {b.depositor?.profile?.city || ''} · Entry {new Date(b.entryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Btn variant="ghost" size="sm" onClick={() => setDetailBooking(b)}>
                        📄 Details & Messages{b._count?.messages ? ` (${b._count.messages})` : ''}
                      </Btn>
                      {status === 'requested' && (
                        <>
                          <Btn variant="primary" size="sm" disabled={busy} onClick={() => handleAccept(b)}>{busy ? 'Accepting…' : 'Accept'}</Btn>
                          <Btn variant="ghost" size="sm" disabled={busy} onClick={() => setRejectBooking(b)}>Decline</Btn>
                        </>
                      )}
                      {status === 'accepted' && (
                        <Btn variant="secondary" size="sm" onClick={() => setReceiptBooking(b)}>Issue Receipt</Btn>
                      )}
                      {status === 'active' && (
                        <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleComplete(b)}>{busy ? 'Completing…' : 'Mark Complete'}</Btn>
                      )}
                    </div>

                    {/* Paperwork (NEW_Changes item 10): invoice, GRN, gate-out pass */}
                    {!['rejected', 'cancelled'].includes(status) && (() => {
                      const gp = b.gateOutPasses?.[0];
                      return (
                        <div style={{ flexBasis: '100%', borderTop: `1px solid ${T.border}`, paddingTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                          {/* Invoice */}
                          {b.invoice ? (
                            <>
                              <span style={{ color: T.muted }}>Invoice {b.invoice.invoiceNumber}:</span>
                              <span style={{ fontWeight: 700, color: b.invoice.status === 'PAID' ? '#15803D' : '#B45309' }}>{b.invoice.status === 'PAID' ? '✓ Paid' : 'Unpaid'}</span>
                              <Btn variant="ghost" size="sm" onClick={() => openDoc(apiGetInvoice, b.invoice.id)}>📄 PDF</Btn>
                              {b.invoice.status === 'UNPAID' && (
                                <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleConfirmPayment(b)}>Confirm Payment</Btn>
                              )}
                            </>
                          ) : (
                            <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleGenerateInvoice(b)}>🧾 Generate & Send Invoice</Btn>
                          )}

                          {/* GRN — auto-issued with the receipt */}
                          {b.goodsReceiptNote ? (
                            <Btn variant="ghost" size="sm" onClick={() => openDoc(apiGetGrn, b.goodsReceiptNote.id)}>📦 GRN {b.goodsReceiptNote.grnNumber}</Btn>
                          ) : (
                            <span style={{ color: T.muted }}>📦 GRN: issued when you issue the receipt</span>
                          )}

                          {/* Gate-out pass */}
                          {status === 'active' && (!gp || gp.status === 'REJECTED') && (
                            <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleRequestGateOut(b)}>🚪 Request Gate-Out</Btn>
                          )}
                          {gp?.status === 'PENDING' && <span style={{ color: '#B45309', fontWeight: 700 }}>🚪 Gate-out awaiting depositor/admin approval</span>}
                          {gp?.status === 'REJECTED' && <span style={{ color: '#B91C1C' }}>Last gate-out rejected{gp.rejectionNote ? `: ${gp.rejectionNote}` : ''}</span>}
                          {gp?.status === 'APPROVED' && (
                            <Btn variant="ghost" size="sm" onClick={() => openDoc(apiGetGateOutPass, gp.id)}>🚪 Gate Pass {gp.passNumber}</Btn>
                          )}
                          {!gp && status !== 'active' && (
                            <span style={{ color: T.muted }}>🚪 Gate-out pass: available once goods are in storage and release is approved</span>
                          )}
                        </div>
                      );
                    })()}
                  </Card>
                );
              })}
            </div>
          )
        )}

        {tab === 'listing' && (
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12.5, marginBottom: 16 }}>
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
        )}

        {tab === 'review' && (
          clarifications.length === 0 ? (
            <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No open questions from AgriConnect about your listing right now.</p></Card>
          ) : (
            <ClarificationThread
              clarifications={clarifications}
              viewerRole="subject"
              onRespond={handleRespondToClarification}
            />
          )
        )}
      </div>

      {addingAnother && (
        <Modal title="Add Another Warehouse" onClose={() => setAddingAnother(false)} width={640}>
          <RegisterWarehouseForm onRegistered={() => { setAddingAnother(false); load(); }} />
        </Modal>
      )}

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onAccept={async (b) => { setDetailBooking(null); await handleAccept(b); }}
          onDecline={(b) => { setDetailBooking(null); setRejectBooking(b); }}
        />
      )}

      {editOpen && (
        <EditWarehouseModal
          warehouse={warehouse}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}

      {mediaOpen && (
        <MediaManagerModal
          mode="listing" entityType="warehouse" entityId={warehouse.id}
          title="Warehouse Photos & Documents"
          onClose={() => setMediaOpen(false)}
        />
      )}

      {receiptBooking && (
        <IssueReceiptModal
          booking={receiptBooking}
          onClose={() => setReceiptBooking(null)}
          onIssued={() => { setReceiptBooking(null); load(); }}
        />
      )}

      {rejectBooking && (
        <RejectBookingModal
          booking={rejectBooking}
          onClose={() => setRejectBooking(null)}
          onRejected={() => { setRejectBooking(null); load(); }}
        />
      )}
    </div>
  );
}
