import { useState, useEffect } from 'react';
import {
  apiAdminGetCategories,
  apiAdminCreateCategory,
  apiAdminUpdateCategory,
  apiAdminDeactivateCategory,
  apiAdminReactivateCategory,
} from '../../lib/api';
import { Card, Btn, Badge, Modal } from '../ui';
import T from '../../theme';
import { inputStyle } from './shared';

// ─── CATEGORIES PANEL ───────────────────────────────────────────────────────
// This is the actual "add a new category like Pulses" feature. Categories
// are real database rows now, not a hardcoded enum — admins can add,
// rename, or deactivate them here without any code deploy.
export function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const load = () => {
    setLoading(true);
    apiAdminGetCategories().then(setCategories).catch(() => setCategories([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
          {categories.length} categories · {categories.filter(c => c.isActive).length} active
        </p>
        <Btn variant="gold" onClick={() => setAddModal(true)}>+ Add Category</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
        {categories.map(c => (
          <Card key={c.id} style={{ opacity: c.isActive ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>{c.icon || '📦'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace' }}>{c.slug}</div>
                </div>
              </div>
              <Badge label={c.isActive ? 'Active' : 'Inactive'} type={c.isActive ? 'green' : 'gray'} />
            </div>
            {c.description && <p style={{ fontSize: 11, color: T.muted, margin: '0 0 8px' }}>{c.description}</p>}
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
              {c.activeProductCount} active listing{c.activeProductCount === 1 ? '' : 's'}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="secondary" size="sm" onClick={() => setEditModal(c)}>Edit</Btn>
              {c.isActive ? (
                <Btn variant="danger" size="sm" onClick={async () => {
                  try {
                    const result = await apiAdminDeactivateCategory(c.id);
                    if (result.warning) alert(result.warning);
                    setCategories(prev => prev.map(x => x.id === c.id ? { ...x, isActive: false } : x));
                  } catch (e) { alert(e.message); }
                }}>Deactivate</Btn>
              ) : (
                <Btn variant="secondary" size="sm" onClick={async () => {
                  try {
                    await apiAdminReactivateCategory(c.id);
                    setCategories(prev => prev.map(x => x.id === c.id ? { ...x, isActive: true } : x));
                  } catch (e) { alert(e.message); }
                }}>Reactivate</Btn>
              )}
            </div>
          </Card>
        ))}
        {categories.length === 0 && !loading && (
          <p style={{ color: T.muted, fontSize: 13 }}>No categories yet — add one to get started.</p>
        )}
      </div>

      {addModal && (
        <CategoryFormModal
          title="Add New Category"
          onClose={() => setAddModal(false)}
          onSave={async (data) => {
            const created = await apiAdminCreateCategory(data);
            setCategories(prev => [...prev, { ...created, activeProductCount: 0 }]);
            setAddModal(false);
          }}
        />
      )}

      {editModal && (
        <CategoryFormModal
          title={`Edit — ${editModal.name}`}
          initial={editModal}
          isEdit
          onClose={() => setEditModal(null)}
          onSave={async (data) => {
            const updated = await apiAdminUpdateCategory(editModal.id, data);
            setCategories(prev => prev.map(x => x.id === editModal.id ? { ...x, ...updated } : x));
            setEditModal(null);
          }}
        />
      )}
    </div>
  );
}

export function CategoryFormModal({ title, initial, isEdit, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('Category name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, icon: icon || undefined, description: description || undefined });
    } catch (err) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <label htmlFor="categoriespanel-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>CATEGORY NAME *</label>
      <input id="categoriespanel-f1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Herbs & Spices" style={{ ...inputStyle, marginBottom: 12 }} />

      <label htmlFor="categoriespanel-f2" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>ICON (emoji, optional)</label>
      <input id="categoriespanel-f2" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🌿" style={{ ...inputStyle, marginBottom: 12 }} />

      <label htmlFor="categoriespanel-f3" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>DESCRIPTION (optional)</label>
      <textarea id="categoriespanel-f3" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Shown as a tooltip in filters" style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />

      {isEdit && (
        <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11, color: '#92400E' }}>
          ℹ️ The URL slug ({initial.slug}) stays fixed once products use it — only the display name, icon, and description can change.
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}

      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSave} disabled={loading}>
        {loading ? 'Saving…' : isEdit ? 'Save Changes →' : 'Create Category →'}
      </Btn>
    </Modal>
  );
}
