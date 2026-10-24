// Status vocabulary for transport requests (Phase 3 adds COMPLETED + DISPUTED).
export const TRANSPORT_STATUS = {
  REQUESTED:  { l: 'Awaiting quote',        bg: '#FEF3C7', c: '#B45309' },
  QUOTED:     { l: 'Price under discussion', bg: '#DBEAFE', c: '#1D4ED8' },
  BOOKED:     { l: 'Booked',                bg: '#D1FAE5', c: '#059669' },
  PICKED_UP:  { l: 'Picked up',             bg: '#E0F2FE', c: '#0369A1' },
  IN_TRANSIT: { l: 'In transit',            bg: '#E0F2FE', c: '#0369A1' },
  DELIVERED:  { l: 'Delivered',             bg: '#DCFCE7', c: '#15803D' },
  COMPLETED:  { l: 'Delivery acknowledged', bg: '#DCFCE7', c: '#166534' },
  DISPUTED:   { l: 'Under dispute',         bg: '#FEE2E2', c: '#991B1B' },
  CANCELLED:  { l: 'Cancelled',             bg: '#F3F4F6', c: '#6B7280' },
};

export const DISPUTE_CATEGORIES = [
  ['DAMAGED_CARGO', 'Damaged cargo'], ['SHORTAGE', 'Shortage / missing goods'], ['LATE_DELIVERY', 'Late delivery'],
  ['NOT_DELIVERED', 'Not delivered'], ['PRICE_MISMATCH', 'Price mismatch'], ['OTHER', 'Something else'],
];
export const categoryLabel = (c) => (DISPUTE_CATEGORIES.find(([k]) => k === c) || [, c])[1];

// 409 = the price on the table changed under the user: tell them to refresh instead of retrying blindly.
export const STALE_MESSAGE = 'The price on the table changed while you were looking at it. Close this window and review the latest round.';
export function staleAware(fn, onStale) {
  return async (...args) => {
    try { return await fn(...args); } catch (e) {
      if (e?.status === 409) { onStale?.(); throw Object.assign(new Error(e.message && !/^Conflict/i.test(e.message) ? e.message : STALE_MESSAGE), { status: 409 }); }
      throw e;
    }
  };
}

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
