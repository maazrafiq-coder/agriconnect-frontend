import { useState, useEffect } from 'react';
import { apiAdminGetCities, apiAdminCreateCity, apiAdminUpdateCity, apiAdminDeactivateCity, apiAdminReactivateCity } from '../../lib/api';
import { Card, Btn, Badge, Modal } from '../ui';
import T from '../../theme';
import { inputStyle } from './shared';
import useConfirm from '../ui/useConfirm';
import { notify } from '../../lib/notify';

// ─── CITIES PANEL ───────────────────────────────────────────────────────────
export function CitiesPanel() {
  const [confirmNode, confirm] = useConfirm();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const load = () => {
    setLoading(true);
    apiAdminGetCities().then(setCities).catch(() => setCities([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const byProvince = cities.reduce((acc, c) => {
    (acc[c.province] = acc[c.province] || []).push(c);
    return acc;
  }, {});

  return (
    <div>
      {confirmNode}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>{cities.length} cities across {Object.keys(byProvince).length} provinces</p>
        <Btn variant="gold" onClick={() => setAddModal(true)}>+ Add City</Btn>
      </div>

      {Object.entries(byProvince).map(([province, list]) => (
        <div key={province} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 8 }}>{province} ({list.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {list.map(c => (
              <Card key={c.id} style={{ padding: 12, opacity: c.isActive ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <Badge label={c.isActive ? 'Active' : 'Inactive'} type={c.isActive ? 'green' : 'gray'} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <Btn variant="secondary" size="sm" onClick={() => setEditModal(c)}>Edit</Btn>
                  {c.isActive ? (
                    <Btn variant="danger" size="sm" onClick={() => confirm({
                      title: `Deactivate city - ${c.name}`, danger: true, confirmLabel: 'Deactivate',
                      description: `Deactivate "${c.name}"?`,
                      consequences: ['It can no longer be chosen on new listings or registrations.', 'You can reactivate it later.'],
                      run: async () => { await apiAdminDeactivateCity(c.id); setCities(prev => prev.map(x => x.id === c.id ? { ...x, isActive: false } : x)); },
                      successTitle: 'City deactivated',
                    })}>Deactivate</Btn>
                  ) : (
                    <Btn variant="secondary" size="sm" onClick={async () => {
                      try { await apiAdminReactivateCity(c.id); setCities(prev => prev.map(x => x.id === c.id ? { ...x, isActive: true } : x)); } catch (e) { notify(e.message); }
                    }}>Reactivate</Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
      {cities.length === 0 && !loading && <p style={{ color: T.muted, fontSize: 13 }}>No cities yet — add one to get started.</p>}

      {addModal && (
        <CityFormModal title="Add New City" onClose={() => setAddModal(false)} onSave={async (data) => {
          const created = await apiAdminCreateCity(data);
          setCities(prev => [...prev, created]);
          setAddModal(false);
        }} />
      )}
      {editModal && (
        <CityFormModal title={`Edit — ${editModal.name}`} initial={editModal} onClose={() => setEditModal(null)} onSave={async (data) => {
          const updated = await apiAdminUpdateCity(editModal.id, data);
          setCities(prev => prev.map(x => x.id === editModal.id ? { ...x, ...updated } : x));
          setEditModal(null);
        }} />
      )}
    </div>
  );
}

export function CityFormModal({ title, initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [province, setProvince] = useState(initial?.province || 'Punjab');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('City name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, province });
    } catch (err) {
      setError(err.message || 'Failed to save city');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <label htmlFor="citiespanel-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>CITY NAME *</label>
      <input id="citiespanel-f1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bahawalpur" style={{ ...inputStyle, marginBottom: 12 }} />
      <label htmlFor="citiespanel-f2" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PROVINCE</label>
      <select id="citiespanel-f2" value={province} onChange={e => setProvince(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
        {['Punjab', 'Sindh', 'KPK', 'Balochistan'].map(p => <option key={p}>{p}</option>)}
      </select>
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save →'}</Btn>
    </Modal>
  );
}
