import { useState } from 'react';
import { apiIssueReceipt } from '../../lib/api';
import RequestFlowModal from '../ui/RequestFlowModal';
import useRequestId from '../../lib/useRequestId';
import T from '../../theme';
import { inputStyle, labelStyle } from './shared';

// ─── ISSUE RECEIPT MODAL ────────────────────────────────────────────────────
// details -> review -> confirmation. Issuing a receipt starts the storage period
// and gives the depositor a document they can borrow against, so it is reviewed.
export function IssueReceiptModal({ booking, onClose, onIssued }) {
  const [actualQuantityTons, setQty] = useState(booking.quantityTons || '');
  const [moisture, setMoisture] = useState('');
  const [purity, setPurity] = useState('');
  const requestKey = useRequestId(JSON.stringify([booking.id, actualQuantityTons, moisture, purity]));
  const depositor = booking.depositor?.profile?.fullName || 'the depositor';

  const form = (
    <div>
      <p style={{ fontSize: 12.5, color: T.muted, marginBottom: 16 }}>
        For {depositor} - {booking.commodity}
      </p>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="issuereceiptmodal-f1" style={labelStyle}>ACTUAL QUANTITY STORED (TONS)</label>
        <input id="issuereceiptmodal-f1" type="number" min="0.1" step="0.1" style={inputStyle} value={actualQuantityTons} onChange={e => setQty(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 16 }}>
        <div>
          <label htmlFor="issuereceiptmodal-f2" style={labelStyle}>MOISTURE % (OPTIONAL)</label>
          <input id="issuereceiptmodal-f2" type="number" step="0.1" style={inputStyle} value={moisture} onChange={e => setMoisture(e.target.value)} />
        </div>
        <div>
          <label htmlFor="issuereceiptmodal-f3" style={labelStyle}>PURITY % (OPTIONAL)</label>
          <input id="issuereceiptmodal-f3" type="number" step="0.1" style={inputStyle} value={purity} onChange={e => setPurity(e.target.value)} />
        </div>
      </div>
    </div>
  );

  return (
    <RequestFlowModal
      title="Issue Digital Warehouse Receipt"
      stepLabels={['Details', 'Review', 'Issued']}
      form={form}
      canReview
      validate={() => (!(Number(actualQuantityTons) > 0) ? 'Enter the actual stored quantity.' : null)}
      reviewTitle="Check the receipt before issuing"
      reviewNotice="Issuing the receipt records the goods as received and starts the storage period. The depositor can then use the receipt, including as loan collateral. Check the quantity and quality figures - they are shown on the receipt."
      summaryRows={[
        { label: 'Booking', value: booking.bookingReference },
        { label: 'Depositor', value: depositor },
        { label: 'Commodity', value: booking.commodity },
        { label: 'Booked quantity', value: booking.quantityTons != null ? `${booking.quantityTons} tons` : undefined },
        { label: 'Actual quantity', value: `${Number(actualQuantityTons)} tons`, accent: true },
        { label: 'Moisture', value: moisture ? `${moisture}%` : 'Not recorded' },
        { label: 'Purity', value: purity ? `${purity}%` : 'Not recorded' },
      ]}
      confirmLabel="Issue Receipt"
      confirmingLabel="Issuing…"
      onSubmit={() => {
        const qualityMetrics = {};
        if (moisture) qualityMetrics.moisture = Number(moisture);
        if (purity) qualityMetrics.purity = Number(purity);
        return apiIssueReceipt(booking.id, { actualQuantityTons: Number(actualQuantityTons), qualityMetrics }, requestKey());
      }}
      success={(res) => ({
        icon: '📄',
        title: 'Receipt issued',
        reference: res?.receiptNumber || res?.receipt?.receiptNumber,
        referenceLabel: 'Receipt',
        message: `${depositor} can now see the receipt in their account.`,
        rows: [
          { label: 'Booking', value: booking.bookingReference },
          { label: 'Actual quantity', value: `${Number(actualQuantityTons)} tons` },
        ],
        status: 'Issued',
      })}
      onClose={onClose}
      onDone={() => onIssued?.()}
    />
  );
}
