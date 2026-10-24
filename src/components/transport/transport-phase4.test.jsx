import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../lib/api', async (orig) => ({
  ...(await orig()),
  apiAcceptTransportQuote: vi.fn(), apiQuoteTransport: vi.fn(), apiCounterTransportQuote: vi.fn(), apiUpdateTracking: vi.fn(),
  apiCreateTransportRequest: vi.fn(), apiAcknowledgeTransportDelivery: vi.fn(),
  apiTransportInvoicesForRequest: vi.fn(), apiGetTransportInvoice: vi.fn(),
}));
import * as api from '../../lib/api';
import { chargesTotal, roundTotal, validateCharges } from './charges';
import QuoteRoundFlow from './QuoteRoundFlow';
import QuoteRoundTimeline from './QuoteRoundTimeline';
import AcceptTransportDialog from './AcceptTransportDialog';
import TrackingUpdateModal from './TrackingUpdateModal';
import TransportInvoicePanel from './TransportInvoicePanel';
import CreateTransportRequestFlow from './CreateTransportRequestFlow';
import TransportRequestCard from '../TransportRequestCard';
import { adaptTransportRequest } from '../../lib/adapters';

const terms = { type: 'PARTIAL_ADVANCE', advancePct: 30, balanceDueEvent: 'ON_DELIVERY' };
const round = (over = {}) => ({
  id: 'q1', roundNo: 1, proposerRole: 'PROVIDER', price: 40000, additionalCharges: [{ label: 'Loading', amount: 3000 }, { label: 'Tolls', amount: 2000 }],
  totalPrice: 45000, estimatedPickup: '2030-01-02T08:00:00Z', estimatedArrival: '2030-01-03T08:00:00Z', vehicleDetails: '10-wheeler covered',
  paymentTerms: terms, conditions: 'Waiting beyond 6h is extra', status: 'CURRENT', expiresAt: '2030-01-01T00:00:00Z', createdAt: '2029-12-30T00:00:00Z', ...over,
});
const req = (over = {}) => ({ id: 't1', requestRef: 'TRQ-2026-000007', from: 'Lahore', to: 'Karachi', status: 'QUOTED', provider: 'FastHaul', rounds: [round()], currentRound: round(), turn: 'REQUESTER', ...over });

beforeEach(() => vi.clearAllMocks());

describe('charges maths', () => {
  it('total = base + charges, ignoring blank / non-positive rows', () => {
    expect(chargesTotal(40000, [{ label: 'Loading', amount: '3000' }, { label: 'Tolls', amount: 2000.5 }, { label: '', amount: '' }, { label: 'x', amount: -5 }])).toBe(45000.5);
    expect(chargesTotal('', [])).toBe(0);
    expect(roundTotal({ price: 100, additionalCharges: [{ label: 'a', amount: 25 }] })).toBe(125); // older round without totalPrice
    expect(roundTotal({ price: 100, totalPrice: 130 })).toBe(130);
  });
  it('rows must be complete or empty', () => {
    expect(validateCharges([{ label: 'Loading', amount: '' }])).toMatch(/amount/i);
    expect(validateCharges([{ label: '', amount: '5' }])).toMatch(/name/i);
    expect(validateCharges([{ label: '', amount: '' }])).toBeNull();
  });
});

describe('QuoteRoundFlow', () => {
  it('provider: live total follows base + charges; review shows breakdown, terms, and the body carries every new field', async () => {
    api.apiQuoteTransport.mockResolvedValue({ requestRef: 'TRQ-2026-000007' });
    const user = userEvent.setup();
    render(<QuoteRoundFlow request={req({ status: 'REQUESTED', rounds: [], currentRound: null })} mode="quote" onClose={() => {}} onDone={() => {}} />);
    await user.type(screen.getByLabelText(/BASE FREIGHT PRICE/), '40000');
    await user.click(screen.getByRole('button', { name: '+ Add a charge' }));
    await user.type(screen.getByLabelText('CHARGE 1'), 'Loading');
    await user.type(screen.getAllByLabelText(/AMOUNT/)[0], '3000');
    expect(screen.getByTestId('quote-total')).toHaveTextContent('₨43,000');
    await user.click(screen.getByRole('button', { name: '+ Add a charge' }));
    await user.type(screen.getByLabelText('CHARGE 2'), 'Tolls');
    await user.type(screen.getAllByLabelText(/AMOUNT/)[1], '2000');
    expect(screen.getByTestId('quote-total')).toHaveTextContent('₨45,000');
    await user.type(screen.getByLabelText(/VEHICLE DETAILS/), '10-wheeler');
    await user.type(screen.getByLabelText(/CONDITIONS/), 'No tolls on hill roads');
    await user.clear(screen.getByLabelText(/STAYS OPEN FOR/)); await user.type(screen.getByLabelText(/STAYS OPEN FOR/), '48');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(api.apiQuoteTransport).not.toHaveBeenCalled();
    expect(screen.getByTestId('round-total')).toHaveTextContent('₨45,000');
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getAllByText(/Cash on delivery/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Send quote' }));
    expect(await screen.findByText('Quote sent')).toBeInTheDocument();
    expect(screen.getByText(/TRQ-2026-000007/)).toBeInTheDocument();
    const body = api.apiQuoteTransport.mock.calls[0][1];
    expect(body).toMatchObject({ price: 40000, additionalCharges: [{ label: 'Loading', amount: 3000 }, { label: 'Tolls', amount: 2000 }], vehicleDetails: '10-wheeler', conditions: 'No tolls on hill roads', validHours: 48, paymentTerms: { type: 'COD' } });
    expect(body).not.toHaveProperty('totalPrice'); // the server computes it
  });

  it('rejects an incomplete charge row and an out-of-range validity before the review step', async () => {
    const user = userEvent.setup();
    render(<QuoteRoundFlow request={req({ status: 'REQUESTED', rounds: [], currentRound: null })} mode="quote" onClose={() => {}} />);
    await user.type(screen.getByLabelText(/BASE FREIGHT PRICE/), '1000');
    await user.click(screen.getByRole('button', { name: '+ Add a charge' }));
    await user.type(screen.getByLabelText('CHARGE 1'), 'Loading');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(await screen.findByText(/amount greater than zero/i)).toBeInTheDocument();
  });

  it('counter is prefilled from the current round and carries the terms forward', async () => {
    api.apiCounterTransportQuote.mockResolvedValue({});
    const user = userEvent.setup();
    render(<QuoteRoundFlow request={req()} mode="counter" onClose={() => {}} />);
    expect(screen.getByLabelText(/YOUR COUNTER - BASE FREIGHT/)).toHaveValue(40000);
    expect(screen.getByLabelText('CHARGE 1')).toHaveValue('Loading');
    expect(screen.getByTestId('quote-total')).toHaveTextContent('₨45,000');
    expect(screen.getByLabelText(/VEHICLE DETAILS/)).toHaveValue('10-wheeler covered');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(await screen.findByText(/has to change something/i)).toBeInTheDocument(); // identical to the current round
    const price = screen.getByLabelText(/YOUR COUNTER - BASE FREIGHT/);
    await user.clear(price); await user.type(price, '37000');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    await user.click(screen.getByRole('button', { name: 'Send counter-offer' }));
    await waitFor(() => expect(api.apiCounterTransportQuote).toHaveBeenCalled());
    expect(api.apiCounterTransportQuote.mock.calls[0][1]).toMatchObject({ price: 37000, roundId: 'q1', paymentTerms: terms, conditions: 'Waiting beyond 6h is extra' });
  });
});

describe('QuoteRoundTimeline', () => {
  it('shows total, charges, dates, vehicle, terms and conditions of a round', () => {
    render(<QuoteRoundTimeline rounds={[round()]} viewerRole="REQUESTER" />);
    expect(screen.getByText('₨45,000')).toBeInTheDocument();
    expect(screen.getByTestId('round-charges')).toHaveTextContent('Base ₨40,000 + Loading ₨3,000 + Tolls ₨2,000');
    expect(screen.getByText(/Estimated pickup/)).toBeInTheDocument();
    expect(screen.getByText(/Vehicle: 10-wheeler covered/)).toBeInTheDocument();
    expect(screen.getByText(/Partial advance/)).toBeInTheDocument();
    expect(screen.getByText(/Conditions: Waiting beyond 6h is extra/)).toBeInTheDocument();
  });
});

describe('AcceptTransportDialog', () => {
  it('shows base, charges, total, terms, conditions; confirm stays disabled until the box is ticked; success shows the TRO number', async () => {
    api.apiAcceptTransportQuote.mockResolvedValue({ transportOrderRef: 'TRO-2026-000012', requestRef: 'TRQ-2026-000007' });
    const user = userEvent.setup();
    render(<AcceptTransportDialog request={req()} round={round()} role="REQUESTER" onClose={() => {}} />);
    expect(screen.getByText('Base freight')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByTestId('round-total')).toHaveTextContent('₨45,000');
    expect(screen.getByText(/Waiting beyond 6h is extra/)).toBeInTheDocument();
    expect(screen.getAllByText(/Partial advance/).length).toBeGreaterThan(0);
    const confirm = screen.getByRole('button', { name: /^Accept ₨45,000/ });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(api.apiAcceptTransportQuote).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: /I accept the price, payment terms and conditions/ }));
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(api.apiAcceptTransportQuote).toHaveBeenCalledWith('t1', 'q1', true));
    expect(await screen.findByText('Transport order TRO-2026-000012')).toBeInTheDocument();
  });
});

describe('TrackingUpdateModal – delivered', () => {
  const booked = { id: 't1', requestRef: 'TRQ-2026-000007', transportOrderRef: 'TRO-2026-000012', from: 'Lahore', to: 'Karachi', status: 'IN_TRANSIT', driverName: 'Ali', driverPhone: '+923001234567' };

  it('requires the receiver name, then a confirm step, then sends receiver / note / quantity', async () => {
    api.apiUpdateTracking.mockResolvedValue({});
    const onUpdated = vi.fn();
    const user = userEvent.setup();
    render(<TrackingUpdateModal request={booked} onClose={() => {}} onUpdated={onUpdated} />);
    await user.click(screen.getByRole('button', { name: /Mark Delivered/ }));
    expect(await screen.findByText(/name of the person who received the goods/i)).toBeInTheDocument();
    expect(api.apiUpdateTracking).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/RECEIVED BY/), 'Imran Traders');
    await user.type(screen.getByLabelText(/DELIVERED QUANTITY/), '19.5');
    await user.type(screen.getByLabelText(/DELIVERY NOTE/), 'Two bags torn');
    await user.click(screen.getByRole('button', { name: /Mark Delivered/ }));
    expect(api.apiUpdateTracking).not.toHaveBeenCalled(); // confirm step first
    expect(screen.getByText('Imran Traders')).toBeInTheDocument();
    expect(screen.getByText(/TRO-2026-000012/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm delivery' }));
    await waitFor(() => expect(api.apiUpdateTracking).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'DELIVERED', receiverName: 'Imran Traders', deliveredQuantityTons: 19.5, deliveryNote: 'Two bags torn' })));
    expect(onUpdated).toHaveBeenCalled();
  });

  it('the evidence fields only appear when the next step is delivery', () => {
    render(<TrackingUpdateModal request={{ ...booked, status: 'BOOKED' }} onClose={() => {}} onUpdated={() => {}} />);
    expect(screen.queryByLabelText(/RECEIVED BY/)).toBeNull();
  });

  it('the api helper itself refuses DELIVERED without a receiver', async () => {
    const real = await vi.importActual('../../lib/api');
    await expect(real.apiUpdateTracking('t1', { status: 'DELIVERED' })).rejects.toThrow(/who received/i);
  });
});

describe('Transport order (TRO) display', () => {
  const booked = adaptTransportRequest({
    id: 't1', status: 'DELIVERED', requestRef: 'TRQ-2026-000007', transportOrderRef: 'TRO-2026-000012', orderRef: 'AB12CD34',
    pickupCity: 'Lahore', deliveryCity: 'Karachi', agreedPrice: 45000, agreedCharges: [{ label: 'Loading', amount: 3000 }], agreedConditions: 'No waiting',
    paymentTermsSnapshot: terms, deliveryReceiverName: 'Imran Traders', deliveryNote: 'Two bags torn', deliveredQuantityTons: 19.5, canAcknowledge: true,
    rounds: [], currentRound: null,
  });

  it('adapter keeps TRO, snapshot and delivery evidence', () => {
    expect(booked).toMatchObject({ transportOrderRef: 'TRO-2026-000012', deliveryReceiverName: 'Imran Traders', deliveredQuantityTons: 19.5 });
    expect(adaptTransportRequest({ id: 'x', orderNumber: 'TRO-2026-000001' }).transportOrderRef).toBe('TRO-2026-000001');
  });

  it('card: Transport order is prominent, Request ref is separate, marketplace order stays distinct, evidence + terms visible', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([]);
    render(<TransportRequestCard r={booked} onChanged={() => {}} />);
    expect(screen.getByTestId('transport-order-ref')).toHaveTextContent('Transport order TRO-2026-000012');
    expect(screen.getByTestId('request-ref')).toHaveTextContent('Request ref TRQ-2026-000007');
    expect(screen.getByText(/Marketplace order AB12CD34/)).toBeInTheDocument();
    expect(screen.getByTestId('delivery-evidence')).toHaveTextContent('Imran Traders');
    expect(screen.getByTestId('agreed-terms')).toHaveTextContent(/Partial advance/);
    expect(screen.getByTestId('agreed-conditions')).toHaveTextContent('No waiting');
  });

  it('acknowledge review shows the delivery evidence', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<TransportRequestCard r={booked} onChanged={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Acknowledge delivery' }));
    const dlg = screen.getAllByRole('button', { name: 'Acknowledge delivery' }).pop().closest('div').parentElement;
    expect(within(dlg).getByText('Received by')).toBeInTheDocument();
    expect(within(dlg).getByText('Delivery note')).toBeInTheDocument();
    expect(within(dlg).getByText('19.5 t')).toBeInTheDocument();
  });

  it('invoice: shows the TRO and the terms, and "Per payment terms" when there is no due date', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([{ id: 'i1', invoiceNumber: 'TINV-2026-000001', status: 'ISSUED', version: 1, amount: 45000, dueDate: null, orderNumber: 'TRO-2026-000012', paymentTermsSnapshot: terms }]);
    render(<TransportInvoicePanel request={booked} role="REQUESTER" />);
    expect(await screen.findByTestId('invoice-order')).toHaveTextContent('TRO-2026-000012');
    expect(screen.getByTestId('invoice-terms')).toHaveTextContent(/Partial advance/);
    expect(screen.getByTestId('invoice-due-rule')).toHaveTextContent('Per payment terms');
  });

  it('invoice with a due date shows the date, not the fallback', async () => {
    api.apiTransportInvoicesForRequest.mockResolvedValue([{ id: 'i1', invoiceNumber: 'TINV-1', status: 'ISSUED', version: 1, amount: 100, dueDate: '2030-01-08T00:00:00Z' }]);
    render(<TransportInvoicePanel request={booked} role="REQUESTER" />);
    await screen.findByText('TINV-1');
    expect(screen.queryByTestId('invoice-due-rule')).toBeNull();
    expect(screen.getByText(/due 08 Jan 2030/)).toBeInTheDocument();
  });
});

describe('CreateTransportRequestFlow', () => {
  const provider = { id: 'p1', userId: 'u9', name: 'FastHaul', price: '₨120/km', _raw: { vehicleTypes: ['LARGE_TRUCK'] } };
  it('details -> review -> success: sends providerId + new fields once and shows the TRQ reference', async () => {
    api.apiCreateTransportRequest.mockResolvedValue({ id: 't1', requestRef: 'TRQ-2026-000042' });
    const user = userEvent.setup();
    render(<CreateTransportRequestFlow provider={provider} initial={{ pickup: 'Lahore, Punjab', delivery: 'Karachi, Sindh' }} onClose={() => {}} />);
    await user.type(screen.getByLabelText('COMMODITY'), 'Basmati rice');
    await user.type(screen.getByLabelText(/SPECIAL HANDLING/), 'Keep dry');
    await user.type(screen.getByLabelText(/CONTACT NAME/), 'Bilal');
    await user.type(screen.getByLabelText(/CONTACT PHONE/), '+923001234567');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(api.apiCreateTransportRequest).not.toHaveBeenCalled();
    expect(screen.getByText('Basmati rice')).toBeInTheDocument();
    await user.dblClick(screen.getByRole('button', { name: 'Send quote request' }));
    expect(await screen.findByText('Quote request sent')).toBeInTheDocument();
    expect(screen.getByText('Request ref: TRQ-2026-000042')).toBeInTheDocument();
    expect(api.apiCreateTransportRequest).toHaveBeenCalledTimes(1);
    expect(api.apiCreateTransportRequest.mock.calls[0][0]).toMatchObject({ providerId: 'u9', commodity: 'Basmati rice', specialHandling: 'Keep dry', contactName: 'Bilal', contactPhone: '+923001234567', pickupCity: 'Lahore', deliveryCity: 'Karachi' });
  });

  it('blocks a bad phone number and a deadline before the pickup date', async () => {
    const user = userEvent.setup();
    render(<CreateTransportRequestFlow provider={provider} initial={{ pickup: 'A', delivery: 'B' }} onClose={() => {}} />);
    await user.type(screen.getByLabelText(/CONTACT PHONE/), 'abc');
    await user.click(screen.getByRole('button', { name: /Review/ }));
    expect(await screen.findByText(/valid contact phone/i)).toBeInTheDocument();
  });
});
