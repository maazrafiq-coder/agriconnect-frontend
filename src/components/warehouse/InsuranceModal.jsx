import { useState, useEffect } from 'react';
import T from '../../theme';
import { apiBuyInsurance, apiGetInsuranceQuote } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import RequestFlowModal from '../ui/RequestFlowModal';
import useRequestId from '../../lib/useRequestId';
import { InfoRow } from './shared';

// ─── INSURANCE MODAL ──────────────────────────────────────────────────────────
// quote -> review (with commitment) -> confirmation.
// The premium is priced by the warehouse (rate × tons × months left) and computed
// on the server - what you see here is what is recorded. AgriConnect does not
// collect a payment in this step, so nothing here says the premium was paid.
export const InsuranceModal = ({ receipt, onClose }) => {
  const { openLogin } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const receiptId = receipt._raw?.id || receipt.id;
  const requestKey = useRequestId(receiptId);

  useEffect(() => {
    apiGetInsuranceQuote(receiptId).then(setQuote).catch(e => setLoadError(e?.message || 'Could not get a quote.'));
  }, [receiptId]);

  const form = (
    <div>
      <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.tealText, marginBottom: 4 }}>Insuring: {receipt.commodity} - {receipt.qty} {receipt.unit}</div>
        <div style={{ fontSize: 11, color: T.muted }}>Warehouse: {receipt.warehouseName} · {receipt.warehouseCity}</div>
      </div>
      {!quote && !loadError && <div style={{ fontSize: 13, color: T.muted, padding: '12px 0' }}>Getting your quote…</div>}
      {loadError && <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#B91C1C', marginBottom: 14 }}>{loadError}</div>}
      {quote && (
        <>
          <div style={{ background: T.surface, borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <InfoRow label="Provided by" value={quote.provider} />
            <InfoRow label="Rate" value={`₨${quote.rate.toLocaleString()} per ton per month`} />
            <InfoRow label="Period" value={`${quote.months} month${quote.months === 1 ? '' : 's'} (until receipt expiry)`} />
            <InfoRow label="Cover amount" value={`₨${quote.coverageAmount.toLocaleString()} (current value of the goods)`} />
            <InfoRow label="Premium" value={`₨${quote.premiumAmount.toLocaleString()}`} accent={T.gold} />
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 14, lineHeight: 1.6 }}>This cover is offered by the warehouse under its own storage insurance terms. Ask the warehouse for the full policy wording.</div>
        </>
      )}
    </div>
  );

  return (
    <RequestFlowModal
      title="Storage Insurance"
      stepLabels={['Quote', 'Review', 'Active']}
      width={520}
      form={form}
      canReview={!!quote}
      reviewLabel="Review cover →"
      reviewTitle="Confirm storage cover"
      reviewNotice={quote ? `You are committing to ₨${quote.premiumAmount.toLocaleString()} premium for ${quote.months} month${quote.months === 1 ? '' : 's'} of cover on this receipt. AgriConnect does not collect the premium here - settle it with the warehouse under its terms. The cover is tied to this receipt and its expiry date.` : undefined}
      summaryRows={quote ? [
        { label: 'Receipt', value: receipt.number || receipt.id },
        { label: 'Goods', value: `${receipt.commodity} - ${receipt.qty} ${receipt.unit || ''}` },
        { label: 'Provided by', value: quote.provider },
        { label: 'Cover amount', value: `₨${quote.coverageAmount.toLocaleString()}` },
        { label: 'Period', value: `${quote.months} month${quote.months === 1 ? '' : 's'}` },
        { label: 'Premium', value: `₨${quote.premiumAmount.toLocaleString()}`, accent: T.gold },
      ] : []}
      confirmLabel="Activate cover"
      confirmingLabel="Activating…"
      onSubmit={() => apiBuyInsurance({ receiptId }, requestKey())}
      success={(res) => ({
        icon: '🛡️',
        title: 'Cover activated',
        reference: res?.insurance?.policyNumber,
        referenceLabel: 'Policy No.',
        message: 'Your goods are now covered. The premium is settled with the warehouse; nothing was paid through AgriConnect.',
        rows: [
          { label: 'Provided by', value: quote?.provider },
          { label: 'Cover amount', value: quote ? `₨${quote.coverageAmount.toLocaleString()}` : undefined },
          { label: 'Premium', value: quote ? `₨${quote.premiumAmount.toLocaleString()}` : undefined },
          { label: 'Valid until', value: receipt.expiryDate },
        ],
        status: 'Active',
      })}
      onClose={onClose}
      onLogin={openLogin}
    />
  );
};
