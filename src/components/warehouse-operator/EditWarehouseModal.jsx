import { useState } from 'react';
import { apiUpdateWarehouse } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';
import { WarehouseFormFields } from './WarehouseFormFields';

// ─── EDIT WAREHOUSE MODAL (NEW_Changes item 10 — there was previously no
// way to change anything after registration) ────────────────────────────────
export function EditWarehouseModal({ warehouse, onClose, onSaved }) {
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
