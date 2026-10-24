// Disputes on a delivered shipment. Either party can raise one; the other responds; an admin resolves.
//   raise   : category + description (+ optional claim amount) -> review -> success with the dispute number
//   respond : the party the dispute awaits answers with a message
//   withdraw: the party who raised it can take it back while it is still open
import { useState } from 'react';
import { Btn } from '../ui';
import RequestFlowModal from '../ui/RequestFlowModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import TextPromptModal from '../ui/TextPromptModal';
import T from '../../theme';
import { apiRaiseTransportDispute, apiRespondTransportDispute, apiWithdrawTransportDispute } from '../../lib/api';
import { money } from '../../lib/paymentTerms';
import useRequestId from '../../lib/useRequestId';
import { DISPUTE_CATEGORIES, categoryLabel } from './transportStatus';

const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 };
const STATUS = {
  OPEN: ['Open', '#FEF3C7', '#92400E'], RESPONDED: ['Awaiting admin', '#DBEAFE', '#1E40AF'],
  RESOLVED: ['Resolved', '#DCFCE7', '#166534'], WITHDRAWN: ['Withdrawn', '#F3F4F6', '#4B5563'],
};
const OUTCOME = { FAVOUR_REQUESTER: 'In favour of the requester', FAVOUR_PROVIDER: 'In favour of the transporter', SETTLED: 'Settled' };

export function RaiseDisputeFlow({ request, onClose, onDone }) {
  const [category, setCategory] = useState('DAMAGED_CARGO');
  const [description, setDescription] = useState('');
  const [claim, setClaim] = useState('');
  const payload = { category, description: description.trim(), claimAmount: claim ? Number(claim) : undefined };
  const requestId = useRequestId(`${request.id}|${JSON.stringify(payload)}`);
  const validate = () => {
    if (description.trim().length < 10) return 'Describe what went wrong (at least 10 characters).';
    if (claim && !(Number(claim) > 0)) return 'The claim amount must be greater than zero (or leave it empty).';
    return null;
  };
  return (
    <RequestFlowModal
      title="Raise a dispute"
      stepLabels={['Details', 'Review', 'Done']}
      form={(
        <>
          <p style={{ fontSize: 12.5, color: T.muted, margin: '0 0 12px' }}>{request.from} → {request.to}{request.transportOrderRef ? ` · Transport order ${request.transportOrderRef}` : ''}{request.requestRef ? ` · Request ref ${request.requestRef}` : ''}</p>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="rdf-cat" style={lbl}>WHAT IS THE PROBLEM?</label>
            <select id="rdf-cat" style={input} value={category} onChange={e => setCategory(e.target.value)}>
              {DISPUTE_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="rdf-desc" style={lbl}>DESCRIBE IT</label>
            <textarea id="rdf-desc" rows={4} style={input} value={description} onChange={e => setDescription(e.target.value)} placeholder="What happened, how many bags / tons, when you noticed…" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="rdf-claim" style={lbl}>AMOUNT YOU ARE CLAIMING (₨, OPTIONAL)</label>
            <input id="rdf-claim" type="number" min="1" style={input} value={claim} onChange={e => setClaim(e.target.value)} />
          </div>
        </>
      )}
      validate={validate}
      reviewNotice="The shipment is marked “under dispute”: it cannot be acknowledged and payment cannot be submitted until an admin resolves it. The other party is asked to respond."
      summaryRows={[
        { label: 'Shipment', value: `${request.from} → ${request.to}` },
        { label: 'Problem', value: categoryLabel(category) },
        { label: 'Details', value: description.trim() },
        claim ? { label: 'Claim', value: money(claim) } : null,
      ].filter(Boolean)}
      confirmLabel="Raise dispute" confirmingLabel="Raising…" confirmVariant="danger"
      onSubmit={() => apiRaiseTransportDispute(request.id, payload, requestId())}
      success={(res) => ({
        title: 'Dispute raised',
        reference: res?.dispute?.disputeNumber || res?.disputeNumber,
        referenceLabel: 'Dispute',
        status: 'Open - waiting for the other party',
        nextSteps: ['The other party is notified and can respond.', 'An admin reviews and resolves it.'],
      })}
      onClose={onClose} onDone={onDone}
    />
  );
}

// request: adapted request; role: 'REQUESTER' | 'PROVIDER'
export default function TransportDisputePanel({ request, role, onChanged }) {
  const [dialog, setDialog] = useState(null); // 'raise' | { kind: 'respond'|'withdraw', dispute }
  const close = () => { setDialog(null); onChanged?.(); };
  const disputes = request.disputes || [];
  const canRaise = ['DELIVERED', 'COMPLETED'].includes(request.status) && !request.dispute;

  return (
    <div data-testid="transport-disputes">
      {disputes.map(d => {
        const [label, bg, c] = STATUS[d.status] || STATUS.OPEN;
        const mine = d.raisedByRole === role;
        return (
          <div key={d.id} data-testid="dispute-card" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{d.disputeNumber} · {categoryLabel(d.category)}</div>
              <span style={{ background: bg, color: c, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{label}</span>
            </div>
            <div style={{ fontSize: 12, margin: '4px 0' }}>{mine ? 'You raised' : (d.raisedByRole === 'REQUESTER' ? 'The requester raised' : 'The transporter raised')}: “{d.description}”{d.claimAmount ? ` · claim ${money(d.claimAmount)}` : ''}</div>
            {d.response && <div style={{ fontSize: 12, margin: '4px 0' }}>Response: “{d.response}”</div>}
            {d.status === 'RESOLVED' && <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>{OUTCOME[d.resolutionOutcome] || 'Resolved'}{d.resolutionNote ? ` — ${d.resolutionNote}` : ''}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {d.status === 'OPEN' && d.awaiting === role && <Btn variant="primary" size="sm" onClick={() => setDialog({ kind: 'respond', dispute: d })}>Respond</Btn>}
              {['OPEN', 'RESPONDED'].includes(d.status) && mine && <Btn variant="ghost" size="sm" onClick={() => setDialog({ kind: 'withdraw', dispute: d })}>Withdraw dispute</Btn>}
            </div>
          </div>
        );
      })}
      {canRaise && <Btn variant="secondary" size="sm" onClick={() => setDialog('raise')}>⚠ Raise a dispute</Btn>}

      {dialog === 'raise' && <RaiseDisputeFlow request={request} onClose={close} onDone={close} />}
      {dialog?.kind === 'respond' && (
        <TextPromptModal
          title={`Respond to ${dialog.dispute.disputeNumber}`} label="Your response" submitLabel="Send response"
          description="The other party and the admin will see this."
          onSubmit={(text) => apiRespondTransportDispute(dialog.dispute.id, text)}
          onClose={close}
        />
      )}
      {dialog?.kind === 'withdraw' && (
        <ConfirmDialog
          title="Withdraw dispute" confirmLabel="Withdraw dispute" danger
          description={`Withdraw ${dialog.dispute.disputeNumber}? The shipment returns to its previous status.`}
          onConfirm={() => apiWithdrawTransportDispute(dialog.dispute.id)}
          onClose={close}
        />
      )}
    </div>
  );
}
