// The transport invoice for one shipment.
//   provider : issue (once delivered), confirm / send back a submitted payment, void, replace
//   requester: view the amount owed, download the PDF, submit a payment reference
// The amount is the agreed price - set by the server, never typed here. No platform fee on transport.
// The server is the authority on every transition; the buttons only mirror it.
import { useEffect, useState } from 'react';
import { Btn } from '../ui';
import ConfirmDialog from '../ui/ConfirmDialog';
import T from '../../theme';
import {
  apiTransportInvoicesForRequest, apiGetTransportInvoice, apiIssueTransportInvoice, apiSubmitTransportInvoicePayment,
  apiConfirmTransportInvoicePayment, apiRejectTransportInvoicePayment, apiVoidTransportInvoice, apiReplaceTransportInvoice,
} from '../../lib/api';
import { money, describeTerms } from '../../lib/paymentTerms';
import { fmtDate } from './transportStatus';

const INVOICE_STATUS = {
  ISSUED:            { label: 'Awaiting payment',  bg: '#FEF3C7', c: '#92400E' },
  PAYMENT_SUBMITTED: { label: 'Payment submitted', bg: '#DBEAFE', c: '#1E40AF' },
  PAYMENT_CONFIRMED: { label: 'Paid',              bg: '#DCFCE7', c: '#166534' },
  VOID:              { label: 'Void',              bg: '#F3F4F6', c: '#4B5563' },
};
const ISSUABLE = ['DELIVERED', 'COMPLETED', 'DISPUTED'];
const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const min5 = (_s, reason) => (reason.length < 5 ? 'Please write at least 5 characters.' : null);

export default function TransportInvoicePanel({ request, role, onChanged }) {
  const [invoices, setInvoices] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const provider = role === 'PROVIDER';
  const disputed = request.status === 'DISPUTED';

  const load = () => {
    apiTransportInvoicesForRequest(request.id)
      .then(d => { setInvoices(Array.isArray(d) ? d : []); setLoadError(''); })
      .catch(e => { setInvoices([]); setLoadError(e?.message || 'Could not load the invoice.'); });
  };
  useEffect(load, [request.id, request.invoice?.id, request.invoice?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setDialog(null); load(); onChanged?.(); };

  const openPdf = async (inv) => {
    setPdfError('');
    try {
      const full = await apiGetTransportInvoice(inv.id);
      if (!full?.downloadUrl) throw new Error('The PDF is not available right now - please try again in a moment.');
      window.open(full.downloadUrl, '_blank', 'noopener');
    } catch (e) { setPdfError(e?.message || 'Could not open the invoice PDF.'); }
  };

  if (!invoices) return <div style={{ fontSize: 12, color: T.muted }}>Loading invoice…</div>;
  const live = invoices.find(i => i.status !== 'VOID');
  const agreed = request.agreedPrice;
  if (!provider && !invoices.length) {
    return <div style={{ fontSize: 12, color: T.muted }}>The transporter has not issued an invoice yet.</div>;
  }

  return (
    <div data-testid="transport-invoices">
      {loadError && <div role="alert" style={{ color: T.danger, fontSize: 12, marginBottom: 6 }}>⚠ {loadError}</div>}
      {invoices.map(inv => {
        const st = INVOICE_STATUS[inv.status] || INVOICE_STATUS.ISSUED;
        const isLive = inv.status !== 'VOID';
        return (
          <div key={inv.id} data-testid="transport-invoice-card" data-focus-id={inv.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, background: isLive ? '#fff' : T.surface, opacity: isLive ? 1 : 0.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>{inv.invoiceNumber}{inv.version > 1 ? ` (v${inv.version})` : ''}</div>
              <span style={{ background: st.bg, color: st.c, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
            </div>
            {(inv.orderNumber || request.transportOrderRef) && <div data-testid="invoice-order" style={{ fontSize: 12, margin: '4px 0' }}>Transport order: <strong>{inv.orderNumber || request.transportOrderRef}</strong></div>}
            {inv.description && <div style={{ margin: '4px 0', fontSize: 12 }}>{inv.description}</div>}
            {(inv.paymentTermsSnapshot || request.paymentTermsSnapshot) && <div data-testid="invoice-terms" style={{ fontSize: 12, margin: '4px 0' }}>Payment terms: {describeTerms(inv.paymentTermsSnapshot || request.paymentTermsSnapshot)}</div>}
            <div style={{ fontWeight: 800 }}>{provider ? 'Requester owes' : 'Amount due'}: {money(inv.amount)}
              {isLive && inv.status !== 'PAYMENT_CONFIRMED' && (inv.dueDate
                ? <span style={{ fontWeight: 400, color: T.muted }}> · due {fmtDate(inv.dueDate)}</span>
                : <span data-testid="invoice-due-rule" style={{ fontWeight: 400, color: T.muted }}> · Per payment terms</span>)}
            </div>
            {inv.status === 'VOID' && inv.voidReason && <div style={{ color: T.danger, marginTop: 6, fontSize: 12 }}>Voided: {inv.voidReason}</div>}
            {inv.paymentRejectedNote && inv.status === 'ISSUED' && <div style={{ color: T.danger, marginTop: 6, fontSize: 12 }}>Payment not received: {inv.paymentRejectedNote}</div>}
            {inv.paymentReference && ['PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED'].includes(inv.status) && (
              <div style={{ marginTop: 6, fontSize: 12 }}>Payment reference: <strong>{inv.paymentReference}</strong>{inv.paymentNote ? ` — ${inv.paymentNote}` : ''}</div>
            )}
            {disputed && isLive && inv.status === 'ISSUED' && <div style={{ marginTop: 6, fontSize: 12, color: '#991B1B' }}>This shipment is under dispute{provider ? '' : ' - payment can be submitted once it is resolved'}.</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {isLive && <Btn variant="ghost" size="sm" onClick={() => openPdf(inv)}>📄 Invoice PDF</Btn>}
              {!provider && inv.status === 'ISSUED' && !disputed && <Btn variant="primary" size="sm" onClick={() => setDialog({ kind: 'submit', invoice: inv })}>I've paid — submit payment</Btn>}
              {provider && inv.status === 'PAYMENT_SUBMITTED' && (
                <>
                  <Btn variant="primary" size="sm" onClick={() => setDialog({ kind: 'confirm', invoice: inv })}>Confirm payment received</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDialog({ kind: 'reject', invoice: inv })}>Not received</Btn>
                </>
              )}
              {provider && ['ISSUED', 'PAYMENT_SUBMITTED'].includes(inv.status) && (
                <>
                  <Btn variant="ghost" size="sm" onClick={() => setDialog({ kind: 'replace', invoice: inv })}>Replace invoice</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDialog({ kind: 'void', invoice: inv })}>Void</Btn>
                </>
              )}
            </div>
          </div>
        );
      })}
      {pdfError && <div role="alert" style={{ color: T.danger, margin: '4px 0', fontSize: 12 }}>⚠ {pdfError}</div>}
      {provider && !live && ISSUABLE.includes(request.status) && (
        <Btn variant="primary" size="sm" onClick={() => setDialog({ kind: 'issue' })}>Issue invoice</Btn>
      )}
      {provider && !live && !ISSUABLE.includes(request.status) && (
        <div style={{ fontSize: 12, color: T.muted }}>You can invoice this shipment once it is delivered.</div>
      )}

      {dialog?.kind === 'issue' && (
        <ConfirmDialog
          title="Issue invoice" confirmLabel="Issue invoice" confirmingLabel="Issuing…"
          rows={[{ label: 'Shipment', value: `${request.from} → ${request.to}` }, { label: 'Transport order', value: request.transportOrderRef }, { label: 'Request ref', value: request.requestRef }, { label: 'Requester owes', value: money(agreed) }]}
          consequences={['The amount is the agreed price. It is fixed by the server and cannot be edited here.', 'The requester is notified and gets a PDF. If something is wrong you can void it and issue a corrected one (a new number).']}
          onConfirm={() => apiIssueTransportInvoice(request.id)}
          success={(inv) => ({ title: 'Invoice issued', reference: inv?.invoiceNumber, message: 'The requester has been notified.', rows: [{ label: 'Amount due', value: money(inv?.amount ?? agreed) }] })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'submit' && (
        <ConfirmDialog
          title="Submit your payment" confirmLabel="Submit payment" confirmingLabel="Submitting…"
          description={`You are telling the transporter you paid ${money(dialog.invoice.amount)} for ${dialog.invoice.invoiceNumber}. They will check and confirm.`}
          initialState={{ reference: '', note: '' }}
          renderFields={(state, set) => (
            <>
              <label htmlFor="tpay-ref" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Payment reference *</label>
              <input id="tpay-ref" value={state.reference} onChange={e => set({ reference: e.target.value })} placeholder="Bank transfer / cheque / receipt number" style={{ ...input, marginBottom: 8 }} />
              <label htmlFor="tpay-note" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Note (optional)</label>
              <input id="tpay-note" value={state.note} onChange={e => set({ note: e.target.value })} style={input} />
            </>
          )}
          validate={(state) => (state.reference.trim().length < 3 ? 'Enter the payment reference (at least 3 characters).' : null)}
          onConfirm={({ state }) => apiSubmitTransportInvoicePayment(dialog.invoice.id, { reference: state.reference.trim(), note: state.note.trim() || undefined })}
          success={() => ({ title: 'Payment submitted', message: 'The transporter has been asked to confirm they received it.' })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'confirm' && (
        <ConfirmDialog
          title="Confirm payment received" confirmLabel="Confirm payment" confirmingLabel="Confirming…"
          rows={[{ label: 'Invoice', value: dialog.invoice.invoiceNumber }, { label: 'Amount', value: money(dialog.invoice.amount) }, { label: 'Reference', value: dialog.invoice.paymentReference }]}
          consequences={['The invoice is marked paid.', 'This cannot be undone.']}
          onConfirm={() => apiConfirmTransportInvoicePayment(dialog.invoice.id)}
          success={() => ({ title: 'Payment confirmed', message: 'The requester has been notified.' })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'reject' && (
        <ConfirmDialog
          title="Payment not received" confirmLabel="Send back to requester" danger
          description="The invoice goes back to “awaiting payment” and the requester sees your reason."
          reasonLabel="What did you find?" reasonRequired reasonPlaceholder="e.g. Nothing arrived with that reference"
          validate={min5}
          onConfirm={({ reason }) => apiRejectTransportInvoicePayment(dialog.invoice.id, reason)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'void' && (
        <ConfirmDialog
          title="Void invoice" confirmLabel="Void invoice" danger
          description={`Void ${dialog.invoice.invoiceNumber}? The requester is notified and can no longer pay it. You can issue a new one afterwards.`}
          reasonLabel="Reason (the requester will see it)" reasonRequired
          validate={min5}
          onConfirm={({ reason }) => apiVoidTransportInvoice(dialog.invoice.id, reason)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'replace' && (
        <ConfirmDialog
          title="Replace invoice" confirmLabel="Void & issue new" confirmingLabel="Replacing…"
          description={`${dialog.invoice.invoiceNumber} is voided and a corrected invoice with a new number is issued straight away.`}
          reasonLabel="What was wrong with it?" reasonRequired
          validate={min5}
          onConfirm={({ reason }) => apiReplaceTransportInvoice(dialog.invoice.id, reason)}
          success={(inv) => ({ title: 'Invoice replaced', reference: inv?.invoiceNumber, message: 'The requester has been notified.' })}
          onClose={close}
        />
      )}
    </div>
  );
}
