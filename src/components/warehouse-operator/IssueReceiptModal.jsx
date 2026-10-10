import { useState } from 'react';
import { apiIssueReceipt } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';
import { inputStyle, labelStyle } from './shared';

// ─── ISSUE RECEIPT MODAL ────────────────────────────────────────────────────
export function IssueReceiptModal({ booking, onClose, onIssued }) {
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
        <label htmlFor="issuereceiptmodal-f1" style={labelStyle}>ACTUAL QUANTITY STORED (TONS)</label>
        <input id="issuereceiptmodal-f1" type="number" min="0.1" step="0.1" style={inputStyle} value={actualQuantityTons} onChange={e => setQty(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 16 }}>
        <div>
          <label htmlFor="issuereceiptmodal-f2" style={labelStyle}>MOISTURE % (OPTIONAL)</label>
          <input id="issuereceiptmodal-f2" type="number" step="0.1" style={inputStyle} value={moisture} onChange={e => setMoisture(e.target.value)} />
        </div>
        <div>
          <label htmlFor="issuereceiptmodal-f3" style={labelStyle}>PURITY % (OPTIONAL)</label>
          <input id="issuereceiptmodal-f3" type="number" step="0.1" style={inputStyle} value={purity} onChange={e => setPurity(e.target.value)} />
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
