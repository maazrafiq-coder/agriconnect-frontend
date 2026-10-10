import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'b1', role: 'buyer', name: 'Buyer' } }) }));
vi.mock('../lib/api', async (orig) => (await import('../test/stubApi')).stubApi(await orig()));
import * as api from '../lib/api';
import BuyerDashboard from './BuyerDashboard';

const offer = (over = {}) => ({
  id: 'o1', status: 'COUNTERED', quantity: 10, offeredPrice: 90, counterPrice: 100, counterMessage: 'Best I can do',
  expiresAt: '2030-01-01T00:00:00Z', product: { name: 'Super Basmati', unit: 'kg', askingPrice: 110, seller: { profile: { fullName: 'Ali' } } }, ...over,
});

const openOffers = async (user) => {
  await user.click(await screen.findByRole('tab', { name: /Offers/ }));
};
const mount = () => render(<MemoryRouter><BuyerDashboard /></MemoryRouter>);

describe('Buyer → Offers tab (counter-offer decisions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.apiGetSentOffers.mockResolvedValue([offer()]);
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the seller counter price and the total', async () => {
    const user = userEvent.setup();
    mount();
    await openOffers(user);
    expect(await screen.findByText(/Seller's counter: ₨100 per kg · total ₨1,000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept counter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('accepting asks for confirmation, then calls accept-counter and reloads', async () => {
    api.apiAcceptCounter.mockResolvedValue({});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    mount();
    await openOffers(user);
    await user.click(await screen.findByRole('button', { name: 'Accept counter' }));
    expect(confirm.mock.calls[0][0]).toMatch(/total ₨1,000/);
    await waitFor(() => expect(api.apiAcceptCounter).toHaveBeenCalledWith('o1'));
    await waitFor(() => expect(api.apiGetSentOffers.mock.calls.length).toBeGreaterThan(1));
  });

  it('cancelling the confirmation does nothing', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    mount();
    await openOffers(user);
    await user.click(await screen.findByRole('button', { name: 'Accept counter' }));
    expect(api.apiAcceptCounter).not.toHaveBeenCalled();
  });

  it('declining withdraws the offer', async () => {
    api.apiWithdrawOffer.mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    mount();
    await openOffers(user);
    await user.click(await screen.findByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(api.apiWithdrawOffer).toHaveBeenCalledWith('o1'));
    expect(api.apiAcceptCounter).not.toHaveBeenCalled();
  });

  it('shows the server error when accepting fails (e.g. stock gone)', async () => {
    api.apiAcceptCounter.mockRejectedValue(new Error('Not enough stock'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    mount();
    await openOffers(user);
    await user.click(await screen.findByRole('button', { name: 'Accept counter' }));
    expect(await screen.findByText(/Not enough stock/)).toBeInTheDocument();
  });

  it('a pending offer can only be withdrawn, not accepted', async () => {
    api.apiGetSentOffers.mockResolvedValue([offer({ status: 'PENDING', counterPrice: null })]);
    const user = userEvent.setup();
    mount();
    await openOffers(user);
    expect(await screen.findByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept counter' })).toBeNull();
  });
});
