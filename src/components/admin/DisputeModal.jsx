import { useState } from 'react';
import { apiAdminResolveDispute } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';
import { inputStyle } from './shared';

export function DisputeModal({ order, onClose, onResolved }) {
  const [resolution, setResolution] = useState('completed');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal title={`Resolve Dispute — Order ${order.id.slice(0, 8)}`} onClose={onClose}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 8 }}>RESOLUTION</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['completed', '✅ Complete Sale'], ['cancelled', '❌ Cancel & Void']].map(([val, label]) => (
          <button key={val} onClick={() => setResolution(val)} style={{ flex: 1, padding: 10, border: `2px solid ${resolution === val ? T.green : T.border}`, background: resolution === val ? '#F0FDF4' : T.white, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>{label}</button>
        ))}
      </div>
      <label htmlFor="disputemodal-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>RESOLUTION NOTES *</label>
      <textarea id="disputemodal-f1" value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Explain the resolution decision..." style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={async () => {
        if (!note.trim()) { setError('Resolution notes are required'); return; }
        try {
          await apiAdminResolveDispute(order.id, resolution, note);
          onResolved(resolution === 'completed' ? 'COMPLETED' : 'CANCELLED');
        } catch (e) { setError(e.message); }
      }}>Confirm Resolution →</Btn>
    </Modal>
  );
}
