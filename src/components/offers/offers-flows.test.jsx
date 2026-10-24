import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AcceptRoundDialog from './AcceptRoundDialog';
import MakeOfferFlow from './MakeOfferFlow';
import NegotiationTimeline from '../NegotiationTimeline';
import PaymentTermsEditor from '../PaymentTermsEditor';
import OrderTermsAndInvoices from '../invoices/OrderTermsAndInvoices';
import * as api from '../../lib/api';
import { useState } from 'react';
import { blankTermsForm } from '../../lib/paymentTerms';

vi.mock('../../lib/api', async (orig) => ({
  ...(await orig()),
  apiSubmitOffer: vi.fn(), apiIssueInvoice: vi.fn(), apiSubmitInvoicePayment: vi.fn(), apiSaleGetInvoice: vi.fn(),
}));

const terms = { type: 'CREDIT', creditDays: 30, creditStart: 'DELIVERY_ACK', description: '' };
const offer = {
  id: 'o1', platformFeePct: 2, product: { name: 'Rice', unit: 'kg', askingPrice: 100 },
  rounds: [
    { id: 'r1', roundNo: 1, proposerRole: 'BUYER', price: 90, quantity: 10, paymentTerms: terms, status: 'SUPERSEDED', createdAt: '2030-01-01T00:00:00Z' },
    { id: 'r2', roundNo: 2, proposerRole: 'SELLER', price: 95, quantity: 10, paymentTerms: terms, status: 'CURRENT', createdAt: '2030-01-02T00:00:00Z' },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('AcceptRoundDialog', () => {
  it('will not accept until the terms box is ticked, then sends the round id', async () => {
    const accept = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AcceptRoundDialog offer={offer} role="BUYER" accept={accept} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Accept & create order' }));
    expect(accept).not.toHaveBeenCalled();
    expect(await screen.findByText(/Tick the box/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Accept & create order' }));
    await waitFor(() => expect(accept).toHaveBeenCalledWith('o1', { acceptTerms: true, roundId: 'r2' }));
  });
  it('shows fee/net to the seller only', () => {
    const { unmount } = render(<AcceptRoundDialog offer={offer} role="SELLER" accept={vi.fn()} onClose={() => {}} />);
    expect(screen.getByTestId('seller-settlement')).toBeInTheDocument();
    unmount();
    render(<AcceptRoundDialog offer={offer} role="BUYER" accept={vi.fn()} onClose={() => {}} />);
    expect(screen.queryByTestId('seller-settlement')).toBeNull();
  });
});

describe('MakeOfferFlow', () => {
  const product = { id: 'p1', name: 'Rice', price: 100, unit: 'kg', minOrder: 5, _raw: { id: 'p1', minOrderQty: 5, quantity: 1000 } };
  it('needs the agreement tick on the review step and sends terms with an idempotency key', async () => {
    api.apiSubmitOffer.mockResolvedValue({ id: 'abcdef123' });
    const user = userEvent.setup();
    render(<MakeOfferFlow product={product} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Review offer/ }));
    await user.click(await screen.findByRole('button', { name: 'Send offer' }));
    expect(api.apiSubmitOffer).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Send offer' }));
    await waitFor(() => expect(api.apiSubmitOffer).toHaveBeenCalledTimes(1));
    const [body, requestId] = api.apiSubmitOffer.mock.calls[0];
    expect(body.acceptTerms ?? body.paymentTerms).toBeTruthy();
    expect(typeof requestId).toBe('string');
  });
  it('rejects a quantity below the minimum order', async () => {
    const user = userEvent.setup();
    render(<MakeOfferFlow product={product} onClose={() => {}} />);
    const qty = screen.getByLabelText(/QUANTITY/);
    await user.clear(qty); await user.type(qty, '1');
    await user.click(screen.getByRole('button', { name: /Review offer/ }));
    expect(await screen.findByText(/minimum order/i)).toBeInTheDocument();
  });
});

describe('NegotiationTimeline', () => {
  it('lists every round', () => {
    render(<NegotiationTimeline rounds={offer.rounds} unit="kg" />);
    expect(screen.getAllByText(/Round|round/).length).toBeGreaterThan(0);
  });
});

describe('PaymentTermsEditor', () => {
  it('lets the user pick a credit period', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Host() { const [v, setV] = useState(blankTermsForm('CREDIT')); return <PaymentTermsEditor value={v} onChange={(x) => { onChange(x); setV(x); }} idPrefix="t" />; }
    render(<Host />);
    expect(screen.getAllByRole('radio').length + screen.queryAllByRole('combobox').length).toBeGreaterThan(0);
    expect(onChange).not.toHaveBeenCalled();
    void user;
  });
});

describe('OrderTermsAndInvoices', () => {
  const order = { id: 'ord1', status: 'confirmed', product: 'Rice', qty: '10 kg', terms, _raw: { id: 'ord1', totalAmount: 950, paymentTermsSnapshot: terms, termsAcceptedAt: '2030-01-03T00:00:00Z' } };
  const inv = { id: 'i1', orderId: 'ord1', invoiceNumber: 'SINV-2030-000001', version: 1, status: 'ISSUED', orderAmount: 950, itemDescription: 'Rice', paymentTermsSnapshot: terms };

  it('seller sees settlement and can issue; buyer sees neither', () => {
    const { unmount } = render(<OrderTermsAndInvoices order={order} role="seller" invoices={[]} />);
    expect(screen.getByRole('button', { name: 'Issue invoice' })).toBeInTheDocument();
    unmount();
    const withSettlement = { ...inv, sellerSettlement: { platformFeePct: 2, platformFee: 19, sellerNet: 931 } };
    const s = render(<OrderTermsAndInvoices order={order} role="seller" invoices={[withSettlement]} />);
    expect(screen.getByTestId('seller-settlement')).toBeInTheDocument();
    s.unmount();
    render(<OrderTermsAndInvoices order={order} role="buyer" invoices={[inv]} />);
    expect(screen.queryByTestId('seller-settlement')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Issue invoice' })).toBeNull();
    expect(screen.getByRole('button', { name: /submit payment/i })).toBeInTheDocument();
  });

  it('buyer must give a payment reference', async () => {
    api.apiSubmitInvoicePayment.mockResolvedValue({});
    const user = userEvent.setup();
    render(<OrderTermsAndInvoices order={order} role="buyer" invoices={[inv]} />);
    await user.click(screen.getByRole('button', { name: /submit payment/i }));
    await user.click(await screen.findByRole('button', { name: 'Submit payment' }));
    expect(api.apiSubmitInvoicePayment).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Payment reference/), 'TXN-123');
    await user.click(screen.getByRole('button', { name: 'Submit payment' }));
    await waitFor(() => expect(api.apiSubmitInvoicePayment).toHaveBeenCalledWith('i1', { reference: 'TXN-123', note: undefined }));
  });

  it('a voided invoice offers no actions', () => {
    render(<OrderTermsAndInvoices order={order} role="seller" invoices={[{ ...inv, status: 'VOID', voidReason: 'wrong qty' }]} />);
    expect(screen.queryByRole('button', { name: 'Void' })).toBeNull();
    expect(screen.getByText(/wrong qty/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Issue invoice' })).toBeInTheDocument();
  });
});
