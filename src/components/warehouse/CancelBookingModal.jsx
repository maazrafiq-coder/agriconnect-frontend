import { apiCancelBooking } from '../../lib/api';
import ConfirmDialog from '../ui/ConfirmDialog';

// ─── CANCEL BOOKING MODAL ───────────────────────────────────────────────────
// States what cancelling does, collects an optional reason, and ends on a
// confirmation screen. `onCancelled` runs when the person presses Done.
export const CancelBookingModal = ({ booking, onClose, onCancelled }) => (
  <ConfirmDialog
    title={`Cancel Booking - ${booking.reference}`}
    description={`You are about to cancel your booking request at ${booking.warehouseName}.`}
    rows={[
      { label: 'Booking', value: booking.reference },
      { label: 'Warehouse', value: booking.warehouseName },
    ]}
    consequences={[
      'The booking is closed and the warehouse is told.',
      'The reserved space is released for other customers.',
      'To store again you will need to make a new booking.',
    ]}
    danger
    reasonLabel="Reason"
    reasonPlaceholder="Let the warehouse know why, if you'd like…"
    cancelLabel="Keep Booking"
    confirmLabel="Cancel Booking"
    confirmingLabel="Cancelling…"
    onConfirm={({ reason }) => apiCancelBooking(booking.id, reason || undefined)}
    success={() => ({
      icon: '✅',
      title: 'Booking cancelled',
      message: `${booking.reference} at ${booking.warehouseName} has been cancelled.`,
      rows: [{ label: 'Booking', value: booking.reference }, { label: 'Status', value: 'Cancelled' }],
    })}
    onClose={onClose}
    onDone={() => onCancelled?.()}
  />
);
