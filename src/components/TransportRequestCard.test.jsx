import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api', async (orig) => ({
  ...(await orig()),
  apiAcceptTransportQuote: vi.fn(), apiRejectTransportQuote: vi.fn(), apiCancelTransportRequest: vi.fn(),
  apiDeclineTransportRequest: vi.fn(), apiAcknowledgeTransportDelivery: vi.fn(),
  apiCounterTransportQuote: vi.fn(), apiQuoteTransport: vi.fn(), apiUpdateTracking: vi.fn(),
  apiTransportInvoicesForRequest: vi.fn().mockResolvedValue([]),
  apiRaiseTransportDispute: vi.fn(),
}));
import * as api from '../lib/api';
import TransportRequestCard from './TransportRequestCard';

const round = (over = {}) => ({ id: 'q1', roundNo: 1, proposerRole: 'PROVIDER', price: 45000, status: 'CURRENT', message: 'Covered truck', expiresAt: '2030-01-01T00:00:00Z', createdAt: '2030-01-01T00:00:00Z', ...over });
const quoted = { id: 't1', requestRef: 'TRQ-2026-000007', from: 'Lahore', to: 'Karachi', status: 'QUOTED', quotedPrice: 45000, eta: '12 Oct', provider: 'FastHaul', rounds: [round()], currentRound: round(), turn: 'REQUESTER' };

beforeEach(() => vi.clearAllMocks());

describe('TransportRequestCard — requester', () => {
  it('shows the reference, the transporter quote, its note and expiry', () => {
    render(<TransportRequestCard r={quoted} />);
    expect(screen.getByText(/TRQ-2026-000007/)).toBeInTheDocument();
    expect(screen.getByText('₨45,000')).toBeInTheDocument();
    expect(screen.getByText(/Covered truck/)).toBeInTheDocument();
    expect(screen.getByText(/Valid until/)).toBeInTheDocument();
  });

  it('accepting asks for confirmation, then sends the round id and refreshes', async () => {
    api.apiAcceptTransportQuote.mockResolvedValue({});
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<TransportRequestCard r={quoted} onChanged={onChanged} />);
    await user.click(screen.getByRole('button', { name: /^Accept ₨45,000/ }));
    expect(api.apiAcceptTransportQuote).not.toHaveBeenCalled(); // a dialog first, never a one-click booking
    await user.click(screen.getByRole('checkbox', { name: /I accept the price, payment terms and conditions/ }));
    await user.click(screen.getAllByRole('button', { name: /^Accept ₨45,000/ }).pop());
    await waitFor(() => expect(api.apiAcceptTransportQuote).toHaveBeenCalledWith('t1', 'q1', true));
    expect(await screen.findByText('Shipment booked')).toBeInTheDocument();
  });

  it('a stale accept (409) tells the user to review the latest round and refreshes the list', async () => {
    api.apiAcceptTransportQuote.mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<TransportRequestCard r={quoted} onChanged={onChanged} />);
    await user.click(screen.getByRole('button', { name: /^Accept ₨45,000/ }));
    await user.click(screen.getByRole('checkbox', { name: /I accept the price/ }));
    await user.click(screen.getAllByRole('button', { name: /^Accept ₨45,000/ }).pop());
    expect(await screen.findByText(/price on the table changed/i)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('rejecting the quote needs a reason and calls reject-quote (not cancel)', async () => {
    api.apiRejectTransportQuote.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TransportRequestCard r={quoted} onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Reject quote' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(api.apiRejectTransportQuote).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Reason/), 'Too expensive');
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(api.apiRejectTransportQuote).toHaveBeenCalledWith('t1', 'Too expensive'));
    expect(api.apiCancelTransportRequest).not.toHaveBeenCalled();
  });

  it('countering goes form → review → success with the server reference, sending the round id and an idempotency key', async () => {
    api.apiCounterTransportQuote.mockResolvedValue({ requestRef: 'TRQ-2026-000007' });
    const user = userEvent.setup();
    render(<TransportRequestCard r={quoted} onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Counter' }));
    const price = screen.getByLabelText(/YOUR COUNTER - BASE FREIGHT/);
    await user.clear(price); await user.type(price, '40000');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(api.apiCounterTransportQuote).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Send counter-offer' }));
    expect(await screen.findByText('Counter-offer sent')).toBeInTheDocument();
    const [id, body, key] = api.apiCounterTransportQuote.mock.calls[0];
    expect(id).toBe('t1');
    expect(body).toMatchObject({ price: 40000, roundId: 'q1' });
    expect(typeof key).toBe('string');
  });

  it('while their own counter is pending there is nothing to accept, only a wait message', () => {
    const mine = round({ id: 'q2', roundNo: 2, proposerRole: 'REQUESTER', price: 40000 });
    render(<TransportRequestCard r={{ ...quoted, rounds: [round({ status: 'SUPERSEDED' }), mine], currentRound: mine, turn: 'PROVIDER' }} />);
    expect(screen.queryByRole('button', { name: /^Accept/ })).toBeNull();
    expect(screen.getByText(/Waiting for the transporter/)).toBeInTheDocument();
  });

  it('cancelling collects an optional reason and uses a dialog, never window.confirm', async () => {
    api.apiCancelTransportRequest.mockResolvedValue({});
    const confirmSpy = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<TransportRequestCard r={{ ...quoted, status: 'BOOKED', agreedPrice: 45000, currentRound: null, turn: null }} onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Cancel request' }));
    await user.click(screen.getAllByRole('button', { name: 'Cancel request' }).pop());
    await waitFor(() => expect(api.apiCancelTransportRequest).toHaveBeenCalledWith('t1', undefined));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('after booking shows the agreed price, driver details when known, a tracking link and no quote buttons', () => {
    render(<TransportRequestCard r={{ ...quoted, status: 'BOOKED', agreedPrice: 45000, currentRound: null, turn: null, driverName: 'Ali Khan', driverPhone: '+923001234567', vehicleRegNo: 'LEA-1234' }} />);
    expect(screen.queryByRole('button', { name: /^Accept/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Open tracking page/ })).toHaveAttribute('href', '/track/t1');
    expect(screen.getByText(/Agreed price/)).toBeInTheDocument();
    expect(screen.getByTestId('driver-details')).toHaveTextContent('Ali Khan');
    expect(screen.getByTestId('driver-details')).toHaveTextContent('LEA-1234');
  });

  it('says so when no driver has been assigned yet', () => {
    render(<TransportRequestCard r={{ ...quoted, status: 'BOOKED', agreedPrice: 45000, currentRound: null }} />);
    expect(screen.getByTestId('driver-details')).toHaveTextContent(/not added driver details/i);
  });

  it('DELIVERED: acknowledge delivery calls the API; raising a dispute is offered', async () => {
    api.apiAcknowledgeTransportDelivery.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TransportRequestCard r={{ ...quoted, status: 'DELIVERED', agreedPrice: 45000, currentRound: null, canAcknowledge: true, dispute: null, disputes: [] }} onChanged={() => {}} />);
    expect(screen.getByRole('button', { name: /Raise a dispute/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Acknowledge delivery' }));
    await user.click(screen.getAllByRole('button', { name: 'Acknowledge delivery' }).pop());
    await waitFor(() => expect(api.apiAcknowledgeTransportDelivery).toHaveBeenCalledWith('t1', undefined));
  });

  it('DISPUTED: no acknowledge button, a clear banner, and no raise-dispute button while one is open', () => {
    const dispute = { id: 'd1', disputeNumber: 'TDS-2026-000001', status: 'OPEN', category: 'DAMAGED_CARGO', description: 'Bags torn', raisedByRole: 'REQUESTER', awaiting: 'PROVIDER' };
    render(<TransportRequestCard r={{ ...quoted, status: 'DISPUTED', agreedPrice: 45000, currentRound: null, canAcknowledge: false, dispute, disputes: [dispute] }} />);
    expect(screen.getByText(/under dispute/i, { selector: '[role="status"]' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge delivery' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Raise a dispute/ })).toBeNull();
    expect(screen.getByText(/TDS-2026-000001/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw dispute' })).toBeInTheDocument();
  });
});

describe('TransportRequestCard — provider', () => {
  const asked = { id: 't2', requestRef: 'TRQ-2026-000008', from: 'Multan', to: 'Lahore', status: 'REQUESTED', requester: 'Bilal', rounds: [], currentRound: null, turn: 'PROVIDER' };

  it('can send a quote on a new request, via the review flow, with the round id absent', async () => {
    api.apiQuoteTransport.mockResolvedValue({ requestRef: 'TRQ-2026-000008' });
    const user = userEvent.setup();
    render(<TransportRequestCard r={asked} role="PROVIDER" onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Send quote' }));
    await user.type(screen.getByLabelText(/BASE FREIGHT PRICE/), '30000');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getAllByRole('button', { name: 'Send quote' }).pop());
    expect(await screen.findByText('Quote sent')).toBeInTheDocument();
    expect(screen.getAllByText(/TRQ-2026-000008/).length).toBeGreaterThan(0);
    expect(api.apiQuoteTransport.mock.calls[0][1]).toMatchObject({ price: 30000 });
  });

  it('when the requester countered, can accept it (with the round id), reject it, or revise', async () => {
    api.apiAcceptTransportQuote.mockResolvedValue({});
    const mine = round({ status: 'SUPERSEDED' });
    const theirs = round({ id: 'q2', roundNo: 2, proposerRole: 'REQUESTER', price: 40000 });
    const user = userEvent.setup();
    render(<TransportRequestCard r={{ ...asked, status: 'QUOTED', rounds: [mine, theirs], currentRound: theirs, turn: 'PROVIDER' }} role="PROVIDER" onChanged={() => {}} />);
    expect(screen.getByRole('button', { name: 'Reject counter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revise quote' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Accept ₨40,000/ }));
    await user.click(screen.getByRole('checkbox', { name: /I accept the price/ }));
    await user.click(screen.getAllByRole('button', { name: /^Accept ₨40,000/ }).pop());
    await waitFor(() => expect(api.apiAcceptTransportQuote).toHaveBeenCalledWith('t2', 'q2', true));
  });

  it('declining the request needs a reason', async () => {
    api.apiDeclineTransportRequest.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TransportRequestCard r={asked} role="PROVIDER" onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Decline request' }));
    await user.click(screen.getAllByRole('button', { name: 'Decline request' }).pop());
    expect(api.apiDeclineTransportRequest).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Reason/), 'No vehicle that week');
    await user.click(screen.getAllByRole('button', { name: 'Decline request' }).pop());
    await waitFor(() => expect(api.apiDeclineTransportRequest).toHaveBeenCalledWith('t2', 'No vehicle that week'));
  });

  it('booked: offers tracking & driver update; marking picked up without driver details is stopped client-side', async () => {
    const user = userEvent.setup();
    render(<TransportRequestCard r={{ ...asked, status: 'BOOKED', agreedPrice: 30000 }} role="PROVIDER" onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Update tracking & driver/ }));
    await user.click(screen.getByRole('button', { name: /Mark Picked Up/ }));
    expect(await screen.findByText(/driver's name and phone number before marking/i)).toBeInTheDocument();
    expect(api.apiUpdateTracking).not.toHaveBeenCalled();
  });

  it('saves driver name, phone and plate and then advances the status', async () => {
    api.apiUpdateTracking.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TransportRequestCard r={{ ...asked, status: 'BOOKED', agreedPrice: 30000 }} role="PROVIDER" onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Update tracking & driver/ }));
    await user.type(screen.getByLabelText('DRIVER NAME'), 'Ali Khan');
    await user.type(screen.getByLabelText('DRIVER PHONE'), '+923001234567');
    await user.type(screen.getByLabelText('VEHICLE REGISTRATION'), 'LEA-1234');
    await user.click(screen.getByRole('button', { name: /Mark Picked Up/ }));
    await waitFor(() => expect(api.apiUpdateTracking).toHaveBeenCalledWith('t2', expect.objectContaining({ driverName: 'Ali Khan', driverPhone: '+923001234567', vehicleRegNo: 'LEA-1234', status: 'PICKED_UP' })));
  });

  it('delivered: the provider sees the invoice section with an Issue invoice button', async () => {
    render(<TransportRequestCard r={{ ...asked, status: 'DELIVERED', agreedPrice: 30000, dispute: null, disputes: [] }} role="PROVIDER" />);
    expect(await screen.findByRole('button', { name: 'Issue invoice' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge delivery' })).toBeNull();
  });
});
