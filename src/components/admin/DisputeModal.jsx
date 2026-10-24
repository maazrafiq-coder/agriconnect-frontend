import { useState } from 'react';
import { apiAdminResolveDispute } from '../../lib/api';
import RequestFlowModal from '../ui/RequestFlowModal';
import T from '../../theme';
import { inputStyle } from './shared';

export function DisputeModal({ order, onClose, onResolved }) {
  const [resolution, setResolution] = useState('completed');
  const [note, setNote] = useState('');
  const ref = order.id.slice(0, 8);
  const outcome = resolution === 'completed' ? 'Complete the sale' : 'Cancel and void the order';

  const form = (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 8 }}>RESOLUTION</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['completed', '✅ Complete Sale'], ['cancelled', '❌ Cancel & Void']].map(([val, label]) => (
          <button key={val} type="button" onClick={() => setResolution(val)} aria-pressed={resolution === val} style={{ flex: 1, padding: 10, border: `2px solid ${resolution === val ? T.green : T.border}`, background: resolution === val ? '#F0FDF4' : T.white, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>{label}</button>
        ))}
      </div>
      <label htmlFor="disputemodal-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>RESOLUTION NOTES *</label>
      <textarea id="disputemodal-f1" value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Explain the resolution decision..." style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
    </div>
  );

  return (
    <RequestFlowModal
      title={`Resolve Dispute - Order ${ref}`}
      stepLabels={['Decision', 'Review', 'Resolved']}
      form={form}
      validate={() => (!note.trim() ? 'Resolution notes are required' : null)}
      reviewTitle="Confirm the resolution"
      reviewNotice={resolution === 'completed'
        ? 'The order is closed as a completed sale and the dispute ends. Both parties see your notes.'
        : 'The order is cancelled and voided and the dispute ends. Both parties see your notes.'}
      summaryRows={[
        { label: 'Order', value: ref },
        { label: 'Outcome', value: outcome, accent: true },
        { label: 'Notes', value: note.trim() },
      ]}
      confirmLabel="Confirm Resolution"
      confirmingLabel="Resolving…"
      confirmVariant={resolution === 'cancelled' ? 'danger' : 'primary'}
      onSubmit={() => apiAdminResolveDispute(order.id, resolution, note.trim())}
      success={() => ({
        title: 'Dispute resolved',
        message: `Order ${ref}: ${outcome.toLowerCase()}.`,
        status: resolution === 'completed' ? 'Completed' : 'Cancelled',
      })}
      onClose={onClose}
      onDone={() => onResolved(resolution === 'completed' ? 'COMPLETED' : 'CANCELLED')}
    />
  );
}
