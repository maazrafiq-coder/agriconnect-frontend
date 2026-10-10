import { Btn, Modal } from '../ui';
import BookingThread from '../BookingThread';
import T from '../../theme';

// ─── BOOKING DETAIL MODAL — everything the operator needs to decide on a
// booking, plus the conversation thread (incl. "request more information") ──
export function BookingDetailModal({ booking, onClose, onAccept, onDecline }) {
  const d = booking.depositor || {};
  const prof = d.profile || {};
  const fmt = (v) => v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const insured = !!booking.includeInsurance;
  const rows = [
    ['Reference', booking.bookingReference],
    ['Status', booking.status],
    ['Commodity', `${booking.commodity}${booking.variety ? ` · ${booking.variety}` : ''}`],
    ['Quantity', `${booking.quantityTons} tons`],
    ['Packaging', booking.packagingType || 'Not specified'],
    ['Entry date', fmt(booking.entryDate)],
    ['Exit date', fmt(booking.exitDate)],
    ['Duration', `${booking.durationDays} days`],
    ['Rate / ton / month', booking.pricePerTon != null ? `₨${Number(booking.pricePerTon).toLocaleString()}` : '—'],
    ['Insurance', insured ? `Yes — ₨${Number(booking.insuranceCost || 0).toLocaleString()}` : 'No'],
    ['Total cost', `₨${Number(booking.totalCost).toLocaleString()}`],
    ...(['ACTIVE', 'PENDING'].includes(booking.receipt?.lien?.status) ? [[booking.receipt.lien.status === 'PENDING' ? 'Loan application (pending)' : 'Bank lien', `${booking.receipt.lien.bankName} — ₨${Number(booking.receipt.lien.loanAmount).toLocaleString()}`]] : []),
    ['Requested on', fmt(booking.createdAt)],
  ];
  const requester = [
    ['Name', prof.fullName || '—'],
    ['Business', prof.businessName || '—'],
    ['Phone', d.phoneNumber || '—'],
    ['Email', d.email || '—'],
    ['Location', [prof.city, prof.province].filter(Boolean).join(', ') || '—'],
    ['KYC', d.kycStatus || '—'],
  ];
  const Grid = ({ items }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '10px 14px', fontSize: 12.5 }}>
      {items.map(([l, v]) => (
        <div key={l}>
          <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{l.toUpperCase()}</div>
          <div style={{ fontWeight: 600, color: T.text, wordBreak: 'break-word' }}>{v}</div>
        </div>
      ))}
    </div>
  );
  const status = (booking.status || '').toLowerCase();
  return (
    <Modal title={`Booking ${booking.bookingReference || ''}`} onClose={onClose} width={640}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, margin: '0 0 8px' }}>BOOKING</div>
      <Grid items={rows} />
      {booking.notes && (
        <div style={{ marginTop: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}>
          <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>NOTES FROM DEPOSITOR</div>
          {booking.notes}
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, margin: '16px 0 8px' }}>REQUESTER</div>
      <Grid items={requester} />
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, margin: '16px 0 8px' }}>CONVERSATION</div>
      <BookingThread bookingId={booking.id} isOperator closed={['rejected', 'cancelled'].includes(status)} />
      {status === 'requested' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => onDecline(booking)} style={{ flex: 1 }}>Decline</Btn>
          <Btn variant="primary" onClick={() => onAccept(booking)} style={{ flex: 1 }}>Accept booking</Btn>
        </div>
      )}
    </Modal>
  );
}
