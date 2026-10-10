import { useState } from 'react';
import { apiRegisterWarehouse } from '../../lib/api';
import { Card, Btn } from '../ui';
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
        <Btn type="submit" variant="primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Registering…' : 'Register Warehouse'}</Btn>
      </form>
    </Card>
  );
}
