import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api', async (orig) => ({ ...(await orig()), apiAcceptTransportQuote: vi.fn(), apiCancelTransportRequest: vi.fn() }));
import { apiAcceptTransportQuote, apiCancelTransportRequest } from '../lib/api';
import TransportRequestCard from './TransportRequestCard';

const quoted = { id: 't1', from: 'Lahore', to: 'Karachi', status: 'QUOTED', quotedPrice: 45000, eta: '12 Oct', quoteNote: 'Covered truck', provider: 'FastHaul' };

describe('TransportRequestCard quote flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the provider quote with price, ETA and note', () => {
    render(<TransportRequestCard r={quoted} />);
    expect(screen.getByText('₨45,000')).toBeInTheDocument();
    expect(screen.getByText(/Estimated arrival: 12 Oct/)).toBeInTheDocument();
    expect(screen.getByText(/Covered truck/)).toBeInTheDocument();
  });

  it('accepting calls the API with the request id and refreshes the list', async () => {
    apiAcceptTransportQuote.mockResolvedValue({});
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<TransportRequestCard r={quoted} onChanged={onChanged} />);
    await user.click(screen.getByRole('button', { name: /Accept ₨45,000/ }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(apiAcceptTransportQuote).toHaveBeenCalledWith('t1');
  });

  it('declining cancels the request', async () => {
    apiCancelTransportRequest.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TransportRequestCard r={quoted} onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(apiCancelTransportRequest).toHaveBeenCalledWith('t1'));
  });

  it('surfaces a failure (e.g. someone else accepted first) and does not refresh', async () => {
    apiAcceptTransportQuote.mockRejectedValue(new Error('Quote is no longer available'));
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<TransportRequestCard r={quoted} onChanged={onChanged} />);
    await user.click(screen.getByRole('button', { name: /Accept/ }));
    expect(await screen.findByText(/Quote is no longer available/)).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('after booking, shows the agreed price and a tracking link and no quote buttons', () => {
    render(<TransportRequestCard r={{ ...quoted, status: 'BOOKED', agreedPrice: 45000 }} />);
    expect(screen.queryByRole('button', { name: /Accept/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Open tracking page/ })).toHaveAttribute('href', '/track/t1');
    expect(screen.getByText(/Agreed price/)).toBeInTheDocument();
  });
});
