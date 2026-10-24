// Inside an order's details: the payment terms that were agreed (frozen on the
// order) and the seller invoice(s) for it, with the actions each party may take.
//
//   seller: issue invoice, confirm / send back a submitted payment, void, replace,
//           and a separate "your settlement" section (platform fee / net)
//   buyer : view the invoice (full amount owed), submit a payment reference
//
// The server is the authority on every transition; the buttons here only mirror it.
import { useState } from 'react';
import { Btn } from '../ui';
import ConfirmDialog from '../ui/ConfirmDialog';
import PaymentTermsView from '../PaymentTermsView';
import T from '../../theme';
import {
  apiIssueInvoice, apiSaleGetInvoice, apiSubmitInvoicePayment, apiSaleConfirmInvoicePayment,
  apiRejectInvoicePayment, apiVoidInvoice, apiReplaceInvoice,
} from '../../lib/api';
import { describeTerms, money } from '../../lib/paymentTerms';

const INVOICE_STATUS = {
  ISSUED:            { label: 'Awaiting payment',   bg: '#FEF3C7', c: '#92400E' },
  PAYMENT_SUBMITTED: { label: 'Payment submitted',  bg: '#DBEAFE', c: '#1E40AF' },
  PAYMENT_CONFIRMED: { label: 'Paid',               bg: '#DCFCE7', c: '#166534' },
  VOID:              { label: 'Void',               bg: '#F3F4F6', c: '#4B5563' },
};
const ISSUABLE = ['confirmed', 'in_transit', 'delivered', 'completed'];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };

export default function OrderTermsAndInvoices({ order, role, invoices = [], onChanged, focusInvoiceId }) {
  const [dialog, setDialog] = useState(null); // { kind, invoice? }
  const [pdfError, setPdfError] = useState('');
  const raw = order._raw || {};
  const orderId = raw.id || order.id;
  const terms = raw.paymentTermsSnapshot || order.terms || null;
  const total = Number(raw.totalAmount || 0);
  const live = invoices.find(i => i.status !== 'VOID');
  const seller = role === 'seller';
  const close = () => { setDialog(null); onChanged?.(); };

  const openPdf = async (inv) => {
    setPdfError('');
    try {
      const full = await apiSaleGetInvoice(inv.id);
      if (!full?.downloadUrl) throw new Error('The PDF is not available right now - please try again in a moment.');
      window.open(full.downloadUrl, '_blank', 'noopener');
    } catch (e) { setPdfError(e?.message || 'Could not open the invoice PDF.'); }
  };

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: 0.4, marginBottom: 4 }}>AGREED PAYMENT TERMS</div>
      <div data-testid="order-terms">
        <PaymentTermsView terms={terms} total={total} />
        {raw.termsAcceptedAt && <div style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>Accepted {fmtDate(raw.termsAcceptedAt)} · fixed for this order</div>}
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: 0.4, margin: '14px 0 6px' }}>INVOICE</div>
      {invoices.length === 0 && <div style={{ color: T.muted }}>{seller ? 'No invoice issued yet.' : 'The seller has not issued an invoice yet.'}</div>}

      {invoices.map(inv => {
        const st = INVOICE_STATUS[inv.status] || INVOICE_STATUS.ISSUED;
        const isLive = inv.status !== 'VOID';
        return (
          <div key={inv.id} data-focus-id={inv.id} data-testid="invoice-card" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, background: isLive ? '#fff' : T.surface, opacity: isLive ? 1 : 0.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>{inv.invoiceNumber}{inv.version > 1 ? ` (v${inv.version})` : ''}</div>
              <span style={{ background: st.bg, color: st.c, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
            </div>
            <div style={{ margin: '4px 0' }}>{inv.itemDescription}</div>
            <div style={{ fontWeight: 800 }}>{seller ? 'Buyer owes' : 'Amount due'}: {money(inv.orderAmount)}
              {inv.dueDate && isLive && inv.status !== 'PAYMENT_CONFIRMED' && <span style={{ fontWeight: 400, color: T.muted }}> · due {fmtDate(inv.dueDate)}</span>}
            </div>
            <div style={{ marginTop: 6 }}><PaymentTermsView terms={inv.paymentTermsSnapshot} total={Number(inv.orderAmount)} schedule={inv.schedule} /></div>

            {inv.status === 'VOID' && inv.voidReason && <div style={{ color: T.danger, marginTop: 6 }}>Voided: {inv.voidReason}</div>}
            {inv.paymentRejectedNote && inv.status === 'ISSUED' && <div style={{ color: T.danger, marginTop: 6 }}>Payment not received: {inv.paymentRejectedNote}</div>}
            {inv.paymentReference && ['PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED'].includes(inv.status) && (
              <div style={{ marginTop: 6 }}>Payment reference: <strong>{inv.paymentReference}</strong>{inv.paymentNote ? ` — ${inv.paymentNote}` : ''}</div>
            )}

            {seller && inv.sellerSettlement && isLive && (
              <div data-testid="seller-settlement" style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 10px', marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.muted, letterSpacing: 0.4 }}>YOUR SETTLEMENT (not shown to the buyer)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform fee ({inv.sellerSettlement.platformFeePct}%)</span><span>− {money(inv.sellerSettlement.platformFee)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}><span>You receive</span><span>{money(inv.sellerSettlement.sellerNet)}</span></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {isLive && <Btn variant="ghost" size="sm" onClick={() => openPdf(inv)}>📄 Invoice PDF</Btn>}
              {!seller && inv.status === 'ISSUED' && <Btn variant="primary" size="sm" onClick={() => setDialog({ kind: 'submit', invoice: inv })}>I've paid — submit payment</Btn>}
              {seller && inv.status === 'PAYMENT_SUBMITTED' && (
                <>
                  <Btn variant="primary" size="sm" onClick={() => setDialog({ kind: 'confirm', invoice: inv })}>Confirm payment received</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDialog({ kind: 'reject', invoice: inv })}>Not received</Btn>
                </>
              )}
              {seller && ['ISSUED', 'PAYMENT_SUBMITTED'].includes(inv.status) && (
                <>
                  <Btn variant="ghost" size="sm" onClick={() => setDialog({ kind: 'replace', invoice: inv })}>Replace invoice</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDialog({ kind: 'void', invoice: inv })}>Void</Btn>
                </>
              )}
            </div>
          </div>
        );
      })}
      {pdfError && <div role="alert" style={{ color: T.danger, margin: '4px 0' }}>⚠ {pdfError}</div>}

      {seller && !live && ISSUABLE.includes(order.status) && (
        <Btn variant="primary" size="sm" onClick={() => setDialog({ kind: 'issue' })}>Issue invoice</Btn>
      )}

      {dialog?.kind === 'issue' && (
        <ConfirmDialog
          title="Issue invoice" confirmLabel="Issue invoice" confirmingLabel="Issuing…"
          rows={[
            { label: 'Order', value: `${order.product} · ${order.qty}` },
            { label: 'Buyer owes', value: money(total) },
            { label: 'Payment terms', value: describeTerms(terms) },
          ]}
          consequences={['The buyer is notified and receives a PDF for the full order amount.', 'If something is wrong you can void it and issue a corrected one (a new number).']}
          onConfirm={() => apiIssueInvoice(orderId)}
          success={(inv) => ({ title: 'Invoice issued', reference: inv?.invoiceNumber, message: 'The buyer has been notified.', rows: [{ label: 'Amount due', value: money(inv?.orderAmount ?? total) }] })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'submit' && (
        <ConfirmDialog
          title="Submit your payment" confirmLabel="Submit payment" confirmingLabel="Submitting…"
          description={`You are telling the seller you paid ${money(dialog.invoice.orderAmount)} for ${dialog.invoice.invoiceNumber}. They will check and confirm.`}
          initialState={{ reference: '', note: '' }}
          renderFields={(state, set) => (
            <>
              <label htmlFor="pay-ref" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Payment reference *</label>
              <input id="pay-ref" value={state.reference} onChange={e => set({ reference: e.target.value })} placeholder="Bank transfer / cheque / receipt number" style={{ ...input, marginBottom: 8 }} />
              <label htmlFor="pay-note" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Note (optional)</label>
              <input id="pay-note" value={state.note} onChange={e => set({ note: e.target.value })} style={input} />
            </>
          )}
          validate={(state) => (state.reference.trim().length < 3 ? 'Enter the payment reference (at least 3 characters).' : null)}
          onConfirm={({ state }) => apiSubmitInvoicePayment(dialog.invoice.id, { reference: state.reference.trim(), note: state.note.trim() || undefined })}
          success={() => ({ title: 'Payment submitted', message: 'The seller has been asked to confirm they received it.' })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'confirm' && (
        <ConfirmDialog
          title="Confirm payment received" confirmLabel="Confirm payment" confirmingLabel="Confirming…"
          rows={[{ label: 'Invoice', value: dialog.invoice.invoiceNumber }, { label: 'Amount', value: money(dialog.invoice.orderAmount) }, { label: 'Buyer reference', value: dialog.invoice.paymentReference }]}
          consequences={['The invoice is marked paid and the order is marked as paid.', 'This cannot be undone.']}
          onConfirm={() => apiSaleConfirmInvoicePayment(dialog.invoice.id)}
          success={() => ({ title: 'Payment confirmed', message: 'The buyer has been notified.' })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'reject' && (
        <ConfirmDialog
          title="Payment not received" confirmLabel="Send back to buyer" danger
          description="The invoice goes back to “awaiting payment” and the buyer sees your reason."
          reasonLabel="What did you find?" reasonRequired reasonPlaceholder="e.g. Nothing arrived with that reference"
          validate={(_s, reason) => (reason.length < 5 ? 'Please write at least 5 characters.' : null)}
          onConfirm={({ reason }) => apiRejectInvoicePayment(dialog.invoice.id, reason)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'void' && (
        <ConfirmDialog
          title="Void invoice" confirmLabel="Void invoice" danger
          description={`Void ${dialog.invoice.invoiceNumber}? The buyer is notified and can no longer pay it. You can issue a new one afterwards.`}
          reasonLabel="Reason (the buyer will see it)" reasonRequired
          validate={(_s, reason) => (reason.length < 5 ? 'Please write at least 5 characters.' : null)}
          onConfirm={({ reason }) => apiVoidInvoice(dialog.invoice.id, reason)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'replace' && (
        <ConfirmDialog
          title="Replace invoice" confirmLabel="Void & issue new" confirmingLabel="Replacing…"
          description={`${dialog.invoice.invoiceNumber} is voided and a corrected invoice with a new number is issued straight away.`}
          reasonLabel="What was wrong with it?" reasonRequired
          validate={(_s, reason) => (reason.length < 5 ? 'Please write at least 5 characters.' : null)}
          onConfirm={({ reason }) => apiReplaceInvoice(dialog.invoice.id, reason)}
          success={(inv) => ({ title: 'Invoice replaced', reference: inv?.invoiceNumber, message: 'The buyer has been notified.' })}
          onClose={close}
        />
      )}
    </div>
  );
}
