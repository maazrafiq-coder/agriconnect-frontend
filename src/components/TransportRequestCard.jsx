// One transport request / shipment, for either side of it.
//   role="REQUESTER" (default): accept / counter / reject the transporter's quote, cancel until pickup,
//                               follow the shipment, acknowledge delivery, raise a dispute, pay the invoice.
//   role="PROVIDER"           : quote / revise / accept the counter-offer, decline, driver + tracking,
//                               invoice the delivered shipment, answer disputes.
// `r` is an adapted request (lib/adapters.adaptTransportRequest). The server decides every transition;
// the buttons mirror it, are disabled while a call is in flight, and surface the server's message.
import { useState } from 'react';
import { apiRejectTransportQuote, apiCancelTransportRequest, apiDeclineTransportRequest, apiAcknowledgeTransportDelivery } from '../lib/api';
import { Card, Btn } from './ui';
import ConfirmDialog from './ui/ConfirmDialog';
import AcceptTransportDialog from './transport/AcceptTransportDialog';
import PaymentTermsView from './PaymentTermsView';
import QuoteRoundFlow from './transport/QuoteRoundFlow';
import QuoteRoundTimeline from './transport/QuoteRoundTimeline';
import TrackingUpdateModal from './transport/TrackingUpdateModal';
import TransportInvoicePanel from './transport/TransportInvoicePanel';
import TransportDisputePanel from './transport/TransportDisputePanel';
import { TRANSPORT_STATUS, staleAware } from './transport/transportStatus';
import { money } from '../lib/paymentTerms';
import { roundTotal } from './transport/charges';
import T from '../theme';

export { TRANSPORT_STATUS };

export function StatusPill({ status }) {
  const s = TRANSPORT_STATUS[status] || { l: status, bg: '#F3F4F6', c: '#6B7280' };
  return <span style={{ background: s.bg, color: s.c, padding: '3px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{s.l}</span>;
}

const section = { marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 10 };
const h = { fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: 0.4, marginBottom: 6 };

export default function TransportRequestCard({ r, role = 'REQUESTER', onChanged }) {
  const [dialog, setDialog] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const requester = role === 'REQUESTER';
  const cur = r.currentRound || null;
  const curTotal = cur ? roundTotal(cur) : 0;
  const myTurn = r.status === 'QUOTED' && cur && cur.proposerRole !== role;
  const waiting = r.status === 'QUOTED' && cur && cur.proposerRole === role;
  const close = () => { setDialog(null); onChanged?.(); };
  const stale = () => onChanged?.();
  const live = ['BOOKED', 'PICKED_UP', 'IN_TRANSIT'].includes(r.status);
  const afterDelivery = ['DELIVERED', 'COMPLETED', 'DISPUTED'].includes(r.status);
  const trackUrl = `${window.location.origin}/track/${r.id}`;
  const counterpart = requester ? (r.provider ? `Transporter: ${r.provider}` : 'Not yet sent to a transporter') : `Requester: ${r.requester || '—'}`;

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          {r.transportOrderRef && (
            <div data-testid="transport-order-ref" style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' }}>Transport order </span>{r.transportOrderRef}
            </div>
          )}
          <div style={{ fontWeight: 800, fontSize: 14, color: T.green }}>{r.from} → {r.to}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {r.requestRef && <span data-testid="request-ref"><span style={{ fontSize: 10, fontWeight: 700 }}>Request ref </span><strong style={{ color: T.text }}>{r.requestRef}</strong> · </span>}
            {counterpart}
            {r.requiredDate ? ` · Needed by ${r.requiredDate}` : ''}
            {r.cargo ? ` · ${r.cargo}` : ''}{r.weight ? ` · ${r.weight} t` : ''}
          </div>
          {r.orderRef && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Marketplace order {r.orderRef}{r.orderProduct ? ` · ${r.orderProduct}` : ''}</div>}
        </div>
        <StatusPill status={r.status} />
      </div>

      {/* ── price on the table ── */}
      {r.status === 'REQUESTED' && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: T.muted }}>
          {requester ? (r.provider ? 'Waiting for the transporter to send a quote.' : 'Send this request to a transporter from the Transport page.') : 'This customer is waiting for your quote.'}
        </div>
      )}
      {r.status === 'QUOTED' && cur && (
        <div data-testid="current-round" style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
          <div style={{ fontSize: 11, color: T.muted }}>{cur.proposerRole === 'PROVIDER' ? (requester ? "Transporter's quote" : 'Your quote') : (requester ? 'Your counter-offer' : "Requester's counter-offer")} · round {cur.roundNo}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0891B2' }}>{money(curTotal)}</div>
          {cur.additionalCharges?.length > 0 && <div style={{ fontSize: 11, color: T.muted }}>Base {money(cur.price)}{cur.additionalCharges.map(c => ` + ${c.label} ${money(c.amount)}`).join('')}</div>}
          {cur.estimatedPickup && <div style={{ fontSize: 12, color: T.muted }}>Estimated pickup: {new Date(cur.estimatedPickup).toLocaleString('en-PK')}</div>}
          {cur.estimatedArrival && <div style={{ fontSize: 12, color: T.muted }}>Estimated arrival: {r.eta || new Date(cur.estimatedArrival).toLocaleString('en-PK')}</div>}
          {cur.vehicleDetails && <div style={{ fontSize: 12, color: T.muted }}>Vehicle: {cur.vehicleDetails}</div>}
          {cur.message && <div style={{ fontSize: 12, color: T.text, marginTop: 4 }}>“{cur.message}”</div>}
          {waiting && <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>Waiting for the {requester ? 'transporter' : 'requester'} to respond.</div>}
          {cur.expiresAt && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Valid until {new Date(cur.expiresAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}
        </div>
      )}
      {r.status === 'QUOTED' && !cur && r.quotedPrice != null && (
        // older payloads without rounds: show the legacy single quote
        <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
          <div style={{ fontSize: 11, color: T.muted }}>Provider's quote</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0891B2' }}>{money(r.quotedPrice)}</div>
        </div>
      )}

      {/* ── actions while negotiating ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {myTurn && <Btn variant="cyan" size="sm" onClick={() => setDialog('accept')}>{`Accept ${money(curTotal)}`}</Btn>}
        {requester && myTurn && <Btn variant="secondary" size="sm" onClick={() => setDialog('counter')}>Counter</Btn>}
        {myTurn && <Btn variant="ghost" size="sm" onClick={() => setDialog('reject')}>{requester ? 'Reject quote' : 'Reject counter'}</Btn>}
        {!requester && ['REQUESTED', 'QUOTED'].includes(r.status) && !myTurn && <Btn variant="primary" size="sm" onClick={() => setDialog('quote')}>{cur ? 'Revise quote' : 'Send quote'}</Btn>}
        {!requester && myTurn && <Btn variant="secondary" size="sm" onClick={() => setDialog('quote')}>Revise quote</Btn>}
        {!requester && ['REQUESTED', 'QUOTED'].includes(r.status) && <Btn variant="ghost" size="sm" onClick={() => setDialog('decline')}>Decline request</Btn>}
        {requester && ['REQUESTED', 'QUOTED', 'BOOKED'].includes(r.status) && <Btn variant="ghost" size="sm" onClick={() => setDialog('cancel')}>Cancel request</Btn>}
        {!!r.rounds?.length && <Btn variant="ghost" size="sm" onClick={() => setShowHistory(s => !s)}>{showHistory ? 'Hide' : 'Show'} quote history ({r.rounds.length})</Btn>}
      </div>
      {showHistory && <div style={{ marginTop: 10 }}><QuoteRoundTimeline rounds={r.rounds} viewerRole={role} /></div>}

      {/* ── booked → delivered ── */}
      {(live || afterDelivery) && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.text, lineHeight: 1.7 }}>
          {r.agreedPrice != null && <div>Agreed price: <strong>{money(r.agreedPrice)}</strong></div>}
          {r.agreedCharges?.length > 0 && <div style={{ color: T.muted }}>Includes {r.agreedCharges.map(c => `${c.label} ${money(c.amount)}`).join(', ')}</div>}
          {r.paymentTermsSnapshot && (
            <div data-testid="agreed-terms" style={{ margin: '4px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.muted, letterSpacing: 0.4 }}>AGREED PAYMENT TERMS</div>
              <PaymentTermsView terms={r.paymentTermsSnapshot} total={r.agreedPrice} compact />
            </div>
          )}
          {r.agreedConditions && <div data-testid="agreed-conditions">Conditions: {r.agreedConditions}</div>}
          {r.currentLocation && <div>📍 Last known location: {r.currentLocation}</div>}
          {r.eta && r.status !== 'DELIVERED' && live && <div>ETA: {r.eta}</div>}
          <div data-testid="driver-details">
            {r.driverName
              ? <>Driver: <strong>{r.driverName}</strong>{r.driverPhone ? ` · ${r.driverPhone}` : ''}{r.vehicleRegNo ? ` · Vehicle ${r.vehicleRegNo}` : ''}</>
              : <span style={{ color: T.muted }}>{requester ? 'The transporter has not added driver details yet.' : 'Add the driver and vehicle details before pickup.'}</span>}
          </div>
          {r.deliveredAt && <div>Delivered: {r.deliveredAt}</div>}
          {r.deliveryReceiverName && (
            <div data-testid="delivery-evidence">
              Received by: <strong>{r.deliveryReceiverName}</strong>
              {r.deliveredQuantityTons != null ? ` · ${r.deliveredQuantityTons} t delivered` : ''}
              {r.deliveryNote ? <div style={{ color: T.muted }}>Delivery note: {r.deliveryNote}</div> : null}
            </div>
          )}
          {r.acknowledgedAt && <div>Delivery acknowledged: {r.acknowledgedAt}</div>}
          <a href={`/track/${r.id}`} style={{ color: '#0891B2', fontWeight: 700, fontSize: 12 }} title={trackUrl}>Open tracking page →</a>
        </div>
      )}
      {!requester && live && <div style={{ marginTop: 8 }}><Btn variant="secondary" size="sm" onClick={() => setDialog('tracking')}>Update tracking & driver</Btn></div>}

      {requester && r.status === 'DELIVERED' && (
        <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>The transporter marked this delivered. Please check the goods, then confirm receipt — or raise a dispute below if something is wrong.</div>
          <Btn variant="primary" size="sm" disabled={!r.canAcknowledge} onClick={() => setDialog('acknowledge')}>Acknowledge delivery</Btn>
        </div>
      )}
      {r.status === 'DISPUTED' && (
        <div role="status" style={{ background: '#FEF2F2', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12.5, color: '#991B1B' }}>
          This shipment is under dispute. It can’t be acknowledged and payment can’t be submitted until an admin resolves it.
        </div>
      )}

      {afterDelivery && (
        <div style={section}>
          <div style={h}>DISPUTES</div>
          <TransportDisputePanel request={r} role={role} onChanged={onChanged} />
        </div>
      )}
      {afterDelivery && (
        <div style={section}>
          <div style={h}>INVOICE</div>
          <TransportInvoicePanel request={r} role={role} onChanged={onChanged} />
        </div>
      )}

      {/* ── dialogs ── */}
      {dialog === 'accept' && cur && <AcceptTransportDialog request={r} round={cur} role={role} onStale={stale} onClose={close} />}
      {dialog === 'reject' && (
        <ConfirmDialog
          title={requester ? 'Reject this quote' : 'Reject this counter-offer'} confirmLabel="Reject" danger
          description={requester ? 'The request goes back to “awaiting quote”. The transporter sees your reason and can send a new price.' : 'The request goes back to “awaiting quote”. The requester sees your reason.'}
          reasonLabel="Reason (they will see it)" reasonRequired reasonPlaceholder="e.g. Too expensive for this distance"
          validate={(_s, reason) => (reason.length < 5 ? 'Please write at least 5 characters.' : null)}
          onConfirm={staleAware(({ reason }) => apiRejectTransportQuote(r.id, reason), stale)}
          onClose={close}
        />
      )}
      {dialog === 'decline' && (
        <ConfirmDialog
          title="Decline this request" confirmLabel="Decline request" danger
          description="The request returns to the requester unassigned so they can pick another transporter."
          reasonLabel="Reason (the requester will see it)" reasonRequired reasonPlaceholder="e.g. No vehicle available on those dates"
          validate={(_s, reason) => (reason.length < 5 ? 'Please write at least 5 characters.' : null)}
          onConfirm={({ reason }) => apiDeclineTransportRequest(r.id, reason)}
          onClose={close}
        />
      )}
      {dialog === 'cancel' && (
        <ConfirmDialog
          title="Cancel transport request" danger confirmLabel="Cancel request" cancelLabel="Keep request"
          description={`Cancel ${r.requestRef || 'this transport request'}?`}
          consequences={['The transporter is told the request is cancelled.', 'This can’t be undone once the shipment is cancelled.']}
          reasonLabel="Reason" reasonPlaceholder="Optional"
          onConfirm={({ reason }) => apiCancelTransportRequest(r.id, reason || undefined)}
          onClose={close}
        />
      )}
      {dialog === 'acknowledge' && (
        <ConfirmDialog
          title="Acknowledge delivery"
          rows={[
            { label: 'Transport order', value: r.transportOrderRef },
            { label: 'Request ref', value: r.requestRef },
            { label: 'Shipment', value: `${r.from} → ${r.to}` },
            { label: 'Received by', value: r.deliveryReceiverName },
            { label: 'Delivered quantity', value: r.deliveredQuantityTons != null ? `${r.deliveredQuantityTons} t` : '' },
            { label: 'Delivery note', value: r.deliveryNote },
          ]}
          consequences={['You confirm the goods arrived. The transporter can then invoice the shipment.', 'You can still raise a dispute for a short time afterwards.']}
          reasonLabel="Note for the transporter"
          confirmLabel="Acknowledge delivery" confirmingLabel="Saving…"
          onConfirm={({ reason }) => apiAcknowledgeTransportDelivery(r.id, reason || undefined)}
          success={() => ({ title: 'Delivery acknowledged', reference: r.transportOrderRef || r.requestRef, message: 'The transporter has been notified.' })}
          onClose={close}
        />
      )}
      {(dialog === 'quote' || dialog === 'counter') && (
        <QuoteRoundFlow request={r} mode={dialog} onStale={stale} onClose={close} onDone={close} />
      )}
      {dialog === 'tracking' && <TrackingUpdateModal request={r} onClose={() => setDialog(null)} onUpdated={close} />}
    </Card>
  );
}
