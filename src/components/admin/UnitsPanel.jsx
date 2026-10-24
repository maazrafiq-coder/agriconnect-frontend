import { useState, useEffect } from 'react';
import {
  apiAdminGetCategories,
  apiAdminGetUnits,
  apiAdminCreateUnit,
  apiAdminUpdateUnit,
  apiAdminDeactivateUnit,
  apiAdminReactivateUnit,
} from '../../lib/api';
import { Card, Btn, Badge, Modal } from '../ui';
import T from '../../theme';
import { inputStyle } from './shared';
import useConfirm from '../ui/useConfirm';
import { notify } from '../../lib/notify';

// ─── UNITS PANEL ────────────────────────────────────────────────────────────
export function UnitsPanel() {
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiAdminGetUnits().catch(() => []),
      apiAdminGetCategories().catch(() => []),
    ]).then(([u, c]) => { setUnits(u); setCategories(c); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const globalUnits = units.filter(u => !u.categoryId);
  const scopedUnits = units.filter(u => u.categoryId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          {globalUnits.length} global units (apply to all categories) · {scopedUnits.length} category-specific
        </p>
        <Btn variant="gold" onClick={() => setAddModal(true)}>+ Add Unit</Btn>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 8 }}>🌐 Global — available for every category</div>
        <UnitGrid list={globalUnits} onEdit={setEditModal} setUnits={setUnits} />
      </div>

      {categories.map(cat => {
        const list = scopedUnits.filter(u => u.categoryId === cat.id || u.category?.name === cat.name);
        if (list.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 8 }}>{cat.icon} {cat.name}-specific</div>
            <UnitGrid list={list} onEdit={setEditModal} setUnits={setUnits} />
          </div>
        );
      })}

      {units.length === 0 && !loading && <p style={{ color: T.muted, fontSize: 13 }}>No units yet — add one to get started.</p>}

      {addModal && (
        <UnitFormModal title="Add New Unit" categories={categories} onClose={() => setAddModal(false)} onSave={async (data) => {
          const created = await apiAdminCreateUnit(data);
          setUnits(prev => [...prev, created]);
          setAddModal(false);
        }} />
      )}
      {editModal && (
        <UnitFormModal title={`Edit — ${editModal.name}`} initial={editModal} categories={categories} isEdit onClose={() => setEditModal(null)} onSave={async (data) => {
          const updated = await apiAdminUpdateUnit(editModal.id, { name: data.name, sortOrder: data.sortOrder });
          setUnits(prev => prev.map(x => x.id === editModal.id ? { ...x, ...updated } : x));
          setEditModal(null);
        }} />
      )}
    </div>
  );
}

export function UnitGrid({ list, onEdit, setUnits }) {
  const [confirmNode, confirm] = useConfirm();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
      {confirmNode}
      {list.map(u => (
        <Card key={u.id} style={{ padding: 12, opacity: u.isActive ? 1 : 0.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
            <Badge label={u.isActive ? 'Active' : 'Inactive'} type={u.isActive ? 'green' : 'gray'} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Btn variant="secondary" size="sm" onClick={() => onEdit(u)}>Edit</Btn>
            {u.isActive ? (
              <Btn variant="danger" size="sm" onClick={() => confirm({
                title: `Deactivate unit - ${u.name}`, danger: true, confirmLabel: 'Deactivate',
                description: `Deactivate the unit "${u.name}"?`,
                consequences: ['It can no longer be chosen on new listings.', 'Existing listings keep their unit. You can reactivate it later.'],
                run: async () => { await apiAdminDeactivateUnit(u.id); setUnits(prev => prev.map(x => x.id === u.id ? { ...x, isActive: false } : x)); },
                successTitle: 'Unit deactivated',
              })}>Deactivate</Btn>
            ) : (
              <Btn variant="secondary" size="sm" onClick={async () => {
                try { await apiAdminReactivateUnit(u.id); setUnits(prev => prev.map(x => x.id === u.id ? { ...x, isActive: true } : x)); } catch (e) { notify(e.message); }
              }}>Reactivate</Btn>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function UnitFormModal({ title, initial, categories, isEdit, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('Unit name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, categoryId: categoryId || undefined });
    } catch (err) {
      setError(err.message || 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <label htmlFor="unitspanel-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>UNIT NAME *</label>
      <input id="unitspanel-f1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Crates, Litres, Bales" style={{ ...inputStyle, marginBottom: 12 }} />

      {!isEdit && (
        <>
          <label htmlFor="unitspanel-f2" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>APPLIES TO</label>
          <select id="unitspanel-f2" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
            <option value="">🌐 All categories (global)</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name} only</option>)}
          </select>
        </>
      )}
      {isEdit && (
        <div style={{ background: T.surface, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11, color: T.muted }}>
          Scope ({initial.categoryId ? initial.category?.name : 'Global — all categories'}) can't be changed after creation — deactivate this unit and create a new one to move it to a different category.
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Unit →'}</Btn>
    </Modal>
  );
}
