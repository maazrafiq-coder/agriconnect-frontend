import { useState } from 'react';
import { apiAdminRemoveProduct } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';
import { inputStyle } from './shared';

export function RemoveProductModal({ product, onClose, onRemoved }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal title={`Remove Listing — ${product.name}`} onClose={onClose}>
      <label htmlFor="removeproductmodal-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>REASON *</label>
      <textarea id="removeproductmodal-f1" value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Fraudulent listing, policy violation, etc." style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12 }}>⚠ {error}</div>}
      <Btn variant="danger" style={{ width: '100%' }} onClick={async () => {
        if (!reason.trim()) { setError('Reason is required'); return; }
        try {
          await apiAdminRemoveProduct(product.id, reason);
          onRemoved();
        } catch (e) { setError(e.message); }
      }}>Confirm Removal →</Btn>
    </Modal>
  );
}
