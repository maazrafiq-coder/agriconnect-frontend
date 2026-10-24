// Accept the current quote round. Shows exactly what is being agreed - base freight, extra charges,
// total, payment terms (with schedule), conditions and dates - and requires an explicit tick
// "I accept the price, payment terms and conditions" before the confirm button works.
// Sends the reviewed roundId + acceptTerms:true; a newer round (409) can never be accepted by mistake.
import ConfirmDialog from '../ui/ConfirmDialog';
import RoundDetails from './RoundDetails';
import { apiAcceptTransportQuote } from '../../lib/api';
import { money, describeTerms } from '../../lib/paymentTerms';
import { roundTotal } from './charges';
import { staleAware } from './transportStatus';

export default function AcceptTransportDialog({ request, round, role = 'REQUESTER', onClose, onStale }) {
  const total = roundTotal(round);
  const requester = role === 'REQUESTER';
  return (
    <ConfirmDialog
      title="Accept this quote"
      width={540}
      confirmLabel={`Accept ${money(total)}`}
      confirmingLabel="Creating transport order…"
      rows={[
        { label: 'Shipment', value: `${request.from} → ${request.to}` },
        { label: 'Request ref', value: request.requestRef },
        { label: 'Total price', value: money(total), accent: true },
      ]}
      consequences={[
        'A transport order is created at exactly these terms and the shipment is booked.',
        'The price, payment terms and conditions below are frozen on the order and cannot be changed afterwards.',
        `The ${requester ? 'transporter' : 'requester'} is notified.`,
      ]}
      initialState={{ accepted: false }}
      renderFields={(state, set) => (
        <>
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
            <RoundDetails round={round} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={state.accepted} onChange={e => set({ accepted: e.target.checked })} style={{ marginTop: 3 }} />
            <span>I accept the price, payment terms and conditions <span style={{ color: '#6B7280' }}>({money(total)} - {describeTerms(round.paymentTerms)})</span></span>
          </label>
        </>
      )}
      confirmDisabled={(state) => !state.accepted}
      validate={(state) => (state.accepted ? null : 'Tick the box to accept the price, payment terms and conditions.')}
      onConfirm={staleAware(() => apiAcceptTransportQuote(request.id, round.id, true), onStale)}
      success={(res) => {
        const tro = res?.transportOrderRef || res?.orderNumber || res?.request?.transportOrderRef || '';
        return {
          icon: '🤝', title: 'Shipment booked',
          reference: tro ? `Transport order ${tro}` : request.requestRef ? `Request ref ${request.requestRef}` : undefined,
          message: tro
            ? `Your transport order number is ${tro}. ${requester ? 'The transporter will add the driver and vehicle details before pickup.' : 'Add the driver and vehicle details before pickup.'}`
            : (requester ? 'The transporter will add the driver and vehicle details before pickup.' : 'Add the driver and vehicle details before pickup.'),
          rows: [{ label: 'Total price', value: money(total) }, { label: 'Payment terms', value: describeTerms(round.paymentTerms) }],
        };
      }}
      onClose={onClose}
    />
  );
}
