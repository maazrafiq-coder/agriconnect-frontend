import { useState } from 'react';
import { apiRejectBooking } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';
import { inputStyle, labelStyle } from './shared';

// ─── REJECT BOOKING MODAL ────────────────────────────────────────────────────
export function RejectBookingModal({ booking, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!reason.trim()) return setError('Please provide a reason so the depositor understands why.');
    setBusy(true);
    try {
      await apiRejectBooking(booking.id, reason.trim());
      onRejected();
    } catch (err) {
      setError(err.message || 'Could not reject this booking.');
      setBusy(false);
    }
  };

  return (
    <Modal title={`Decline Booking — ${booking.bookingReference || ''}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 14px', lineHeight: 1.6 }}>
        Let {booking.depositor?.profile?.fullName || 'the depositor'} know why you can't accept this booking for {booking.commodity}.
      </p>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="rejectbookingmodal-f1" style={labelStyle}>REASON</label>
        <textarea id="rejectbookingmodal-f1"
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. No capacity available for this commodity right now"
        />
      </div>
      {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="danger" onClick={submit} disabled={busy} style={{ flex: 1 }}>{busy ? 'Declining…' : 'Decline Booking'}</Btn>
      </div>
    </Modal>
  );
}
