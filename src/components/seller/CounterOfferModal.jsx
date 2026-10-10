import { useState } from 'react';
import { apiCounterOffer } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';

// ─── COUNTER OFFER MODAL ────────────────────────────────────────────────────────
export function CounterOfferModal({ offer, onClose, onSent }) {
  const [counterPrice, setCounterPrice] = useState(String(offer.asking - 100));
  const [counterMessage, setCounterMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!counterPrice || Number(counterPrice) <= 0) {
      setError('Enter a valid counter price');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiCounterOffer(offer._raw?.id || offer.id, {
        counterPrice: Number(counterPrice),
        counterMessage: counterMessage || undefined,
      });
      onSent({ counterPrice: Number(counterPrice) });
    } catch (err) {
      setError(err.message || 'Failed to send counter offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Counter Offer — ${offer.buyer}`} onClose={onClose}>
      <div style={{ background: T.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: T.muted }}>Their offer: <strong style={{ color: T.goldText }}>₨{offer.offered}/{offer.productUnit || 'unit'}</strong> · Your asking: ₨{offer.asking}/{offer.productUnit || 'unit'}</div>
      </div>
      <label htmlFor="counteroffermodal-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>YOUR COUNTER PRICE (₨/{offer.productUnit || 'unit'})</label>
      <input id="counteroffermodal-f1" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} type="number" style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 12, fontWeight: 700 }} />
      <label htmlFor="counteroffermodal-f2" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>MESSAGE (optional)</label>
      <textarea id="counteroffermodal-f2" value={counterMessage} onChange={e => setCounterMessage(e.target.value)} rows={3} placeholder="Explain your counter offer..." style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 16 }} />
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={handleSend} disabled={loading}>
        {loading ? 'Sending…' : 'Send Counter Offer →'}
      </Btn>
    </Modal>
  );
}
