import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/api', async (orig) => ({
  ...(await orig()),
  apiTransportInvoicesForRequest: vi.fn(), apiGetTransportInvoice: vi.fn(), apiIssueTransportInvoice: vi.fn(),
  apiSubmitTransportInvoicePayment: vi.fn(), apiConfirmTransportInvoicePayment: vi.fn(), apiRejectTransportInvoicePayment: vi.fn(),
  apiVoidTransportInvoice: vi.fn(), apiReplaceTransportInvoice: vi.fn(),
  apiRaiseTransportDispute: vi.fn(), apiRespondTransportDispute: vi.fn(), apiWithdrawTransportDispute: vi.fn(),
  apiAdminGetTransportDisputes: vi.fn(), apiAdminResolveTransportDispute: vi.fn(),
}));
import * as api from '../../lib/api';
import TransportInvoicePanel from './TransportInvoicePanel';
import TransportDisputePanel from './TransportDisputePanel';
import QuoteRoundTimeline from './QuoteRoundTimeline';
import AdminTransportDisputes from '../admin/AdminTransportDisputes';
import { staleAware } from './transportStatus';

const req = (over = {}) => ({ id: 't1', requestRef: 'TRQ-2026-000001', from: 'Lahore', to: 'Karachi', status: 'DELIVERED', agreedPrice: 50000, disputes: [], dispute: null, ...over });
const inv = (over = {}) => ({ id: 'i1', invoiceNumber: 'TINV-2026-000001', status: 'ISSUED', version: 1, amount: 50000, description: 'Transport Lahore → Karachi', dueDate: '2030-01-08T00:00:00Z', ...over });

beforeEach(() => vi.clearAllMocks());

describe('TransportInvoicePanel', () => {
  it('provider: issue invoice shows the agreed price (not editable) and the server invoice number on success', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([]);
    api.apiIssueTransportInvoice.mockResolvedValue(inv());
    const user = userEvent.setup();
    render(<TransportInvoicePanel request={req()} role="PROVIDER" onChanged={() => {}} />);
    await user.click(await screen.findByRole('button', { name: 'Issue invoice' }));
    expect(screen.getByText('₨50,000')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).toBeNull(); // no amount input
    await user.click(screen.getAllByRole('button', { name: 'Issue invoice' }).pop());
    await waitFor(() => expect(api.apiIssueTransportInvoice).toHaveBeenCalledWith('t1'));
    expect(await screen.findByText('TINV-2026-000001')).toBeInTheDocument();
  });

  it('provider cannot issue before delivery', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([]);
    render(<TransportInvoicePanel request={req({ status: 'BOOKED' })} role="PROVIDER" />);
    expect(await screen.findByText(/once it is delivered/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Issue invoice' })).toBeNull();
  });

  it('requester: sees nothing to pay until an invoice exists; then submits a payment reference (required)', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValueOnce([]);
    const { unmount } = render(<TransportInvoicePanel request={req()} role="REQUESTER" />);
    expect(await screen.findByText(/has not issued an invoice yet/i)).toBeInTheDocument();
    unmount();

    api.apiTransportInvoicesForRequest.mockResolvedValue([inv()]);
    api.apiSubmitTransportInvoicePayment.mockResolvedValue(inv({ status: 'PAYMENT_SUBMITTED' }));
    const user = userEvent.setup();
    render(<TransportInvoicePanel request={req()} role="REQUESTER" />);
    await user.click(await screen.findByRole('button', { name: /submit payment/i }));
    await user.click(screen.getByRole('button', { name: 'Submit payment' }));
    expect(api.apiSubmitTransportInvoicePayment).not.toHaveBeenCalled();
    expect(await screen.findByText(/at least 3 characters/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Payment reference/), 'TXN-998');
    await user.click(screen.getByRole('button', { name: 'Submit payment' }));
    await waitFor(() => expect(api.apiSubmitTransportInvoicePayment).toHaveBeenCalledWith('i1', { reference: 'TXN-998', note: undefined }));
  });

  it('requester sees no fee/settlement section, and cannot submit payment while the shipment is disputed', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([inv()]);
    render(<TransportInvoicePanel request={req({ status: 'DISPUTED' })} role="REQUESTER" />);
    await screen.findByText('TINV-2026-000001');
    expect(screen.queryByText(/platform fee/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /submit payment/i })).toBeNull();
    expect(screen.getByText(/under dispute/i)).toBeInTheDocument();
  });

  it('provider: confirm / not received on a submitted payment; void & replace on an open invoice', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([inv({ status: 'PAYMENT_SUBMITTED', paymentReference: 'TXN-998' })]);
    api.apiConfirmTransportInvoicePayment.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TransportInvoicePanel request={req()} role="PROVIDER" onChanged={() => {}} />);
    expect(await screen.findByText(/TXN-998/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not received' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace invoice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Void' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm payment received' }));
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }));
    await waitFor(() => expect(api.apiConfirmTransportInvoicePayment).toHaveBeenCalledWith('i1'));
  });

  it('voiding needs a reason of 5+ characters', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([inv()]);
    api.apiVoidTransportInvoice.mockResolvedValue({});
    const user = userEvent.setup();
    render(<TransportInvoicePanel request={req()} role="PROVIDER" onChanged={() => {}} />);
    await user.click(await screen.findByRole('button', { name: 'Void' }));
    await user.click(screen.getByRole('button', { name: 'Void invoice' }));
    expect(api.apiVoidTransportInvoice).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Reason/), 'Wrong amount');
    await user.click(screen.getByRole('button', { name: 'Void invoice' }));
    await waitFor(() => expect(api.apiVoidTransportInvoice).toHaveBeenCalledWith('i1', 'Wrong amount'));
  });

  it('PDF: opens the signed download link; shows an error if there is none', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([inv()]);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    api.apiGetTransportInvoice.mockResolvedValueOnce({ downloadUrl: 'https://files.example/x.pdf' });
    const user = userEvent.setup();
    render(<TransportInvoicePanel request={req()} role="REQUESTER" />);
    await user.click(await screen.findByRole('button', { name: /Invoice PDF/ }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://files.example/x.pdf', '_blank', 'noopener'));
    api.apiGetTransportInvoice.mockResolvedValueOnce({ downloadUrl: null });
    await user.click(screen.getByRole('button', { name: /Invoice PDF/ }));
    expect(await screen.findByText(/PDF is not available/)).toBeInTheDocument();
  });
});

describe('TransportDisputePanel', () => {
  it('raising a dispute: needs a description, reviews, sends with an idempotency key, shows the dispute number', async () => {
    api.apiRaiseTransportDispute.mockResolvedValue({ dispute: { disputeNumber: 'TDS-2026-000003' } });
    const user = userEvent.setup();
    render(<TransportDisputePanel request={req()} role="REQUESTER" onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Raise a dispute/ }));
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(await screen.findByText(/at least 10 characters/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('DESCRIBE IT'), 'Ten bags were torn open');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Raise dispute' }));
    expect(await screen.findByText(/TDS-2026-000003/)).toBeInTheDocument();
    const [id, body, key] = api.apiRaiseTransportDispute.mock.calls[0];
    expect(id).toBe('t1');
    expect(body).toMatchObject({ category: 'DAMAGED_CARGO', description: 'Ten bags were torn open' });
    expect(typeof key).toBe('string');
  });

  it('the party a dispute awaits can respond; the raiser can withdraw; nobody else gets those buttons', async () => {
    const d = { id: 'd1', disputeNumber: 'TDS-2026-000003', status: 'OPEN', category: 'LATE_DELIVERY', description: 'Two days late', raisedByRole: 'REQUESTER', awaiting: 'PROVIDER' };
    const r = req({ status: 'DISPUTED', dispute: d, disputes: [d] });
    api.apiRespondTransportDispute.mockResolvedValue({});
    const user = userEvent.setup();
    const { unmount } = render(<TransportDisputePanel request={r} role="PROVIDER" onChanged={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Withdraw dispute' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Respond' }));
    await user.type(screen.getByLabelText('Your response'), 'Road closure');
    await user.click(screen.getByRole('button', { name: 'Send response' }));
    await waitFor(() => expect(api.apiRespondTransportDispute).toHaveBeenCalledWith('d1', 'Road closure'));
    unmount();
    render(<TransportDisputePanel request={r} role="REQUESTER" onChanged={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Respond' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Withdraw dispute' })).toBeInTheDocument();
  });

  it('shows the admin’s resolution', () => {
    const d = { id: 'd1', disputeNumber: 'TDS-1', status: 'RESOLVED', category: 'SHORTAGE', description: 'x', raisedByRole: 'REQUESTER', resolutionOutcome: 'SETTLED', resolutionNote: 'Partial refund agreed' };
    render(<TransportDisputePanel request={req({ disputes: [d] })} role="REQUESTER" />);
    expect(screen.getByText(/Settled — Partial refund agreed/)).toBeInTheDocument();
  });
});

describe('QuoteRoundTimeline', () => {
  it('lists rounds with who proposed and the outcome', () => {
    render(<QuoteRoundTimeline viewerRole="REQUESTER" rounds={[
      { id: 'a', roundNo: 1, proposerRole: 'PROVIDER', price: 50000, status: 'SUPERSEDED', createdAt: '2030-01-01T00:00:00Z' },
      { id: 'b', roundNo: 2, proposerRole: 'REQUESTER', price: 45000, status: 'ACCEPTED', createdAt: '2030-01-02T00:00:00Z' },
    ]} />);
    const items = screen.getAllByTestId('quote-round');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Transporter quoted');
    expect(items[1]).toHaveTextContent('You countered');
    expect(items[1]).toHaveTextContent('Accepted');
  });
});

describe('staleAware', () => {
  it('turns a 409 into a refresh prompt and calls onStale; passes other errors through', async () => {
    const onStale = vi.fn();
    await expect(staleAware(() => Promise.reject(Object.assign(new Error('Conflict'), { status: 409 })), onStale)()).rejects.toThrow(/changed/);
    expect(onStale).toHaveBeenCalled();
    await expect(staleAware(() => Promise.reject(new Error('boom')), onStale)()).rejects.toThrow('boom');
  });
});

describe('AdminTransportDisputes', () => {
  it('lists open disputes first and resolves one with outcome + note', async () => {
    api.apiAdminGetTransportDisputes.mockResolvedValue([
      { id: 'd2', disputeNumber: 'TDS-2', status: 'RESOLVED', category: 'OTHER', description: 'old', raisedByRole: 'PROVIDER', resolutionOutcome: 'SETTLED', resolutionNote: 'ok' },
      { id: 'd1', disputeNumber: 'TDS-1', status: 'OPEN', category: 'DAMAGED_CARGO', description: 'torn', raisedByRole: 'REQUESTER' },
    ]);
    api.apiAdminResolveTransportDispute.mockResolvedValue({});
    const user = userEvent.setup();
    render(<AdminTransportDisputes />);
    const cards = await screen.findAllByTestId('admin-dispute');
    expect(cards[0]).toHaveTextContent('TDS-1');
    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await user.click(screen.getByRole('button', { name: 'Resolve dispute' }));
    expect(await screen.findByText(/is required/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Outcome/), 'FAVOUR_REQUESTER');
    await user.type(screen.getByLabelText(/Resolution note/), 'Photos confirm damage');
    await user.click(screen.getByRole('button', { name: 'Resolve dispute' }));
    await waitFor(() => expect(api.apiAdminResolveTransportDispute).toHaveBeenCalledWith('d1', { outcome: 'FAVOUR_REQUESTER', note: 'Photos confirm damage' }));
  });
});
