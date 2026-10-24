import { useState } from 'react';
import { apiRegisterWarehouse } from '../../lib/api';
import { Card, Btn, InfoRow } from '../ui';
import useRequestId from '../../lib/useRequestId';
import T from '../../theme';
import { WarehouseFormFields } from './WarehouseFormFields';

// ─── REGISTER FORM (shown when no warehouse profile exists yet) ────────────
export function RegisterWarehouseForm({ onRegistered }) {
  const [form, setForm] = useState({
    name: '', type: 'DRY_STORAGE', city: '', province: 'Punjab', address: '',
    totalCapacityTons: '', pricePerTonMonth: '', minDurationDays: '30',
    commoditiesAccepted: [], ratesByCommodity: {}, insuranceAvailable: false,
    insurancePricePerTonMonth: '', description: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(null);
  const requestKey = useRequestId(JSON.stringify(form));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleCommodity = (c) => {
    setForm(f => ({
      ...f,
      commoditiesAccepted: f.commoditiesAccepted.includes(c)
        ? f.commoditiesAccepted.filter(x => x !== c)
        : [...f.commoditiesAccepted, c],
    }));
  };

  const goReview = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.city || !form.address) return setError('Name, city, and address are required.');
    if (!form.commoditiesAccepted.length) return setError('Select at least one commodity you accept.');
    if (!form.totalCapacityTons || !form.pricePerTonMonth) return setError('Capacity and price are required.');
    if (form.insuranceAvailable && form.insurancePricePerTonMonth === '') return setError('Enter an insurance rate, or untick "Storage insurance available".');

    setReviewing(true);
  };

  const submit = async () => {
    setError('');
    if (busy) return;
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
      }, requestKey());
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not register your warehouse.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Card style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 10 }}>🏭</div>
        <h3 role="status" style={{ margin: '0 0 8px', color: T.green }}>Warehouse submitted</h3>
        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: '0 0 8px' }}>{form.name} is awaiting verification by AgriConnect. It is not visible to depositors until it is verified; you will be notified of the outcome.</p>
        <Btn variant="primary" onClick={() => onRegistered()}>Done</Btn>
      </Card>
    );
  }

  if (reviewing) {
    return (
      <Card style={{ maxWidth: 560, margin: '0 auto' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: T.green }}>Review your warehouse</h3>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: T.muted }}>Submitting sends this listing to AgriConnect for verification before it goes live.</p>
        <div style={{ background: T.surface, borderRadius: 10, padding: '4px 14px', marginBottom: 14 }}>
          <InfoRow label="Name" value={form.name} />
          <InfoRow label="Type" value={form.type} />
          <InfoRow label="Location" value={`${form.address}, ${form.city}, ${form.province}`} />
          <InfoRow label="Capacity" value={`${Number(form.totalCapacityTons).toLocaleString()} tons`} />
          <InfoRow label="Rate" value={`₨${Number(form.pricePerTonMonth).toLocaleString()} per ton per month`} />
          <InfoRow label="Minimum stay" value={`${form.minDurationDays} days`} />
          <InfoRow label="Commodities" value={form.commoditiesAccepted.join(', ')} />
          <InfoRow label="Insurance" value={form.insuranceAvailable ? `Available, ₨${Number(form.insurancePricePerTonMonth).toLocaleString()} per ton per month` : 'Not offered'} />
        </div>
        {error && <p role="alert" style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
          <Btn variant="ghost" onClick={() => { setError(''); setReviewing(false); }} disabled={busy}>← Back</Btn>
          <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</Btn>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 560, margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: T.green }}>List Your Warehouse</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12.5, color: T.muted }}>
        Set up your storage facility once — buyers will be able to find and book it from the marketplace.
      </p>
      <form onSubmit={goReview}>
        <WarehouseFormFields form={form} set={set} toggleCommodity={toggleCommodity} />
        {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <Btn type="submit" variant="primary" style={{ width: '100%' }}>Review →</Btn>
      </form>
    </Card>
  );
}
