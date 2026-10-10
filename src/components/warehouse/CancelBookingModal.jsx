import { useState } from 'react';
import T from '../../theme';
import { apiCancelBooking } from '../../lib/api';
import { Btn } from '../ui';
import { Modal } from './shared';

// ─── CANCEL BOOKING MODAL ───────────────────────────────────────────────────
export const CancelBookingModal = ({ booking, onClose, onCancelled }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apiCancelBooking(booking.id, reason || undefined);
      onCancelled();
    } catch (e) {
      setError(e?.message || 'Failed to cancel this booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Cancel Booking — ${booking.reference}`} onClose={onClose}>
      <p style={{fontSize:13,color:T.muted,margin:'0 0 14px',lineHeight:1.6}}>
        This will cancel your booking request at <strong>{booking.warehouseName}</strong>. This can't be undone.
      </p>
      <div style={{marginBottom:14}}>
        <label htmlFor="cancelbookingmodal-f1" style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:5,display:'block'}}>REASON (OPTIONAL)</label>
        <textarea id="cancelbookingmodal-f1"
          value={reason}
          onChange={e=>setReason(e.target.value)}
          placeholder="Let the warehouse know why, if you'd like…"
          style={{width:'100%',minHeight:60,padding:'9px 12px',border:`1.5px solid ${T.border}`,borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'vertical'}}
        />
      </div>
      {error && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#B91C1C'}}>⚠ {error}</div>}
      <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:8}}>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>Keep Booking</Btn>
        <Btn variant="danger" onClick={submit} disabled={submitting}>{submitting ? 'Cancelling…' : 'Cancel Booking'}</Btn>
      </div>
    </Modal>
  );
};
