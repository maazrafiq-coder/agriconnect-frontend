import { apiRejectBooking } from '../../lib/api';
import ConfirmDialog from '../ui/ConfirmDialog';

// ─── REJECT BOOKING MODAL ────────────────────────────────────────────────────
// A reason is required (the depositor sees it). Ends on a confirmation screen.
export function RejectBookingModal({ booking, onClose, onRejected }) {
  const depositor = booking.depositor?.profile?.fullName || 'the depositor';
  return (
    <ConfirmDialog
      title={`Decline Booking - ${booking.bookingReference || ''}`}
      description={`Tell ${depositor} why you can't accept this booking for ${booking.commodity}.`}
      consequences={[
        'The booking is closed and the depositor is notified with your reason.',
        'The reserved capacity is released.',
      ]}
      danger
      reasonLabel="Reason"
      reasonRequired
      reasonPlaceholder="e.g. No capacity available for this commodity right now"
      confirmLabel="Decline Booking"
      confirmingLabel="Declining…"
      onConfirm={({ reason }) => apiRejectBooking(booking.id, reason)}
      success={() => ({
        icon: '✅',
        title: 'Booking declined',
        message: `${depositor} has been notified.`,
        rows: [{ label: 'Booking', value: booking.bookingReference }, { label: 'Status', value: 'Declined' }],
      })}
      onClose={onClose}
      onDone={() => onRejected?.()}
    />
  );
}
