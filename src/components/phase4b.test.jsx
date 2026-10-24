import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api', async (orig) => ({
  ...(await orig()),
  apiBookTesting: vi.fn(),
  apiCancelBooking: vi.fn(),
  apiRejectBooking: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ openLogin: vi.fn(), closeModal: vi.fn(), openRegister: vi.fn(), openForgot: vi.fn(), user: { id: 'u1' } }) }));

import { apiBookTesting, apiCancelBooking, apiRejectBooking } from '../lib/api';
import LabBookingFlow from './testing/LabBookingFlow';
import { CancelBookingModal } from './warehouse/CancelBookingModal';
import { RejectBookingModal } from './warehouse-operator/RejectBookingModal';
import { estimateLabFee } from '../lib/labFee';

const agency = { id: 'a1', userId: 'au1', name: 'Punjab Lab', city: 'Lahore', price: 1000, turnaround: '48h', services: ['Moisture', 'Aflatoxin'] };

beforeEach(() => vi.clearAllMocks());

describe('LabBookingFlow', () => {
  it('reviews before sending, says no payment, sends selected services + date + Idempotency-Key, shows the server reference', async () => {
    const user = userEvent.setup();
    apiBookTesting.mockResolvedValue({ requestNumber: 'TST-2026-000007', fee: 1350 });
    render(<LabBookingFlow agency={agency} product={{ id: 'p1', name: 'Basmati' }} onClose={() => {}} />);
    expect(screen.queryByText(/pay/i)).toBeNull();
    await user.click(screen.getByLabelText('Aflatoxin')); // untick one service
    await user.type(screen.getByLabelText(/PREFERRED DATE/), '2099-01-05');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(screen.getByText(/No payment is taken now/)).toBeInTheDocument();
    expect(screen.getByText('Basmati')).toBeInTheDocument();
    expect(apiBookTesting).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Send Test Request' }));
    expect(await screen.findByText(/TST-2026-000007/)).toBeInTheDocument();
    const [payload, key] = apiBookTesting.mock.calls[0];
    expect(payload).toMatchObject({ agencyId: 'au1', productId: 'p1', servicesRequested: ['Moisture'], scheduledDate: '2099-01-05' });
    expect(key).toBeTruthy();
  });

  it('keeps the review and shows an error when the server fails (no success screen)', async () => {
    const user = userEvent.setup();
    apiBookTesting.mockRejectedValue(new Error('boom'));
    render(<LabBookingFlow agency={agency} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Send Test Request' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Test request sent')).toBeNull();
  });

  it('mirrors the server fee rule', () => {
    expect(estimateLabFee(1000, 1)).toBe(1000);
    expect(estimateLabFee(1000, 3)).toBe(1700);
    expect(estimateLabFee(1000, 0)).toBe(0);
  });
});

describe('warehouse dialogs', () => {
  it('cancel booking states consequences and ends on a confirmation', async () => {
    const user = userEvent.setup();
    apiCancelBooking.mockResolvedValue({});
    const onCancelled = vi.fn();
    render(<CancelBookingModal booking={{ id: 'b1', reference: 'WB-1', warehouseName: 'Store A' }} onClose={() => {}} onCancelled={onCancelled} />);
    expect(screen.getByText('This cannot be undone')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel Booking' }));
    expect(await screen.findByText('Booking cancelled')).toBeInTheDocument();
    expect(onCancelled).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it('declining a booking requires a reason', async () => {
    const user = userEvent.setup();
    apiRejectBooking.mockResolvedValue({});
    render(<RejectBookingModal booking={{ id: 'b1', bookingReference: 'WB-1', commodity: 'Wheat' }} onClose={() => {}} onRejected={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Decline Booking' }));
    expect(apiRejectBooking).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Reason/), 'No space');
    await user.click(screen.getByRole('button', { name: 'Decline Booking' }));
    expect(apiRejectBooking).toHaveBeenCalledWith('b1', 'No space');
    expect(await screen.findByText('Booking declined')).toBeInTheDocument();
  });
});
