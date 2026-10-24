// The commercial content of one quote round: base freight, extra charges, all-in total,
// dates, vehicle, payment terms and conditions. Used by the review step, the accept dialog and the history.
import T from '../../theme';
import PaymentTermsView from '../PaymentTermsView';
import { money, describeTerms } from '../../lib/paymentTerms';
import { roundTotal } from './charges';
import { fmtDateTime } from './transportStatus';

const row = { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontSize: 12.5 };
const head = { fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: 0.4, margin: '10px 0 4px' };

// round: { price, additionalCharges, totalPrice?, estimatedPickup, estimatedArrival, vehicleDetails, paymentTerms, conditions }
// compact: one-line payment terms (history); otherwise the full instalment table
export default function RoundDetails({ round, compact = false, showPayment = true }) {
  if (!round) return null;
  const charges = round.additionalCharges || [];
  const total = roundTotal(round);
  return (
    <div data-testid="round-details">
      <div style={row}><span>Base freight</span><strong>{money(round.price)}</strong></div>
      {charges.map((c, i) => <div key={i} style={row}><span>{c.label}</span><span>{money(c.amount)}</span></div>)}
      <div style={{ ...row, borderTop: `1px solid ${T.border}`, marginTop: 3, paddingTop: 6, fontWeight: 800, fontSize: 14 }}>
        <span>Total price</span><span data-testid="round-total">{money(total)}</span>
      </div>
      {(round.estimatedPickup || round.estimatedArrival || round.vehicleDetails) && (
        <div style={{ marginTop: 8, fontSize: 12, color: T.text, lineHeight: 1.6 }}>
          {round.estimatedPickup && <div>Estimated pickup: <strong>{fmtDateTime(round.estimatedPickup)}</strong></div>}
          {round.estimatedArrival && <div>Estimated arrival: <strong>{fmtDateTime(round.estimatedArrival)}</strong></div>}
          {round.vehicleDetails && <div>Vehicle: <strong>{round.vehicleDetails}</strong></div>}
        </div>
      )}
      {showPayment && (
        <>
          <div style={head}>PAYMENT TERMS</div>
          {compact ? <div style={{ fontSize: 12, fontWeight: 700 }}>{describeTerms(round.paymentTerms)}</div> : <PaymentTermsView terms={round.paymentTerms} total={total} />}
        </>
      )}
      {round.conditions && (
        <>
          <div style={head}>CONDITIONS</div>
          <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{round.conditions}</div>
        </>
      )}
    </div>
  );
}
