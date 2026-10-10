import { useState } from 'react';
import { apiRejectOffer } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';

// ─── DECLINE OFFER MODAL (with required reason) ───────────────────────────────
export function DeclineOfferModal({ offer, onClose, onDeclined }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const QUICK_REASONS = ['Price too low', 'Insufficient quantity available', 'Already sold to another buyer', 'Quality requirements not met'];

  const handleDecline = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason — the buyer will see this');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiRejectOffer(offer._raw?.id || offer.id, reason);
      onDeclined(reason);
    } catch (err) {
      setError(err.message || 'Failed to decline offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Decline Offer — ${offer.buyer}`} onClose={onClose}>
      <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: T.muted }}>{offer.product} · {offer.qty} · Offered: <strong style={{ color: T.goldText }}>₨{offer.offered}/{offer.productUnit || 'unit'}</strong></div>
      </div>
      <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {QUICK_REASONS.map(r => (
          <button key={r} onClick={() => setReason(r)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 14, border: `1.5px solid ${reason === r ? T.danger : T.border}`, background: reason === r ? '#FEE2E2' : T.white, color: reason === r ? T.danger : T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{r}</button>
        ))}
      </div>
      <label htmlFor="declineoffermodal-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>REASON (visible to buyer) *</label>
      <textarea id="declineoffermodal-f1" value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Let the buyer know why you're declining..." style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="danger" style={{ width: '100%' }} onClick={handleDecline} disabled={loading}>
        {loading ? 'Declining…' : 'Confirm Decline →'}
      </Btn>
    </Modal>
  );
}
