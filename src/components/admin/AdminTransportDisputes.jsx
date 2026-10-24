// Admin: transport disputes. Lists them (open first) and resolves one with an outcome + note.
// Self-contained: loads its own data so the rest of the admin dashboard is untouched.
import { useEffect, useState } from 'react';
import { Card, Btn, LoadingState, ErrorState } from '../ui';
import ConfirmDialog from '../ui/ConfirmDialog';
import T from '../../theme';
import { apiAdminGetTransportDisputes, apiAdminResolveTransportDispute } from '../../lib/api';
import { categoryLabel } from '../transport/transportStatus';
import { money } from '../../lib/paymentTerms';

const OUTCOMES = [
  ['FAVOUR_REQUESTER', 'In favour of the requester'], ['FAVOUR_PROVIDER', 'In favour of the transporter'], ['SETTLED', 'Settled between the parties'],
];
const ORDER = { OPEN: 0, RESPONDED: 0, RESOLVED: 1, WITHDRAWN: 2 };
const input = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };

export default function AdminTransportDisputes() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [resolving, setResolving] = useState(null);

  const load = () => {
    setState('loading');
    apiAdminGetTransportDisputes()
      .then(d => { setRows(Array.isArray(d) ? d : (d?.data || [])); setState('ready'); })
      .catch(() => setState('error'));
  };
  useEffect(load, []);
  const sorted = [...rows].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
  const open = rows.filter(d => ['OPEN', 'RESPONDED'].includes(d.status)).length;

  return (
    <div style={{ marginTop: 28 }} data-testid="admin-transport-disputes">
      <div style={{ fontSize: 13, fontWeight: 700, color: T.green, margin: '0 0 10px' }}>⚖️ Transport Disputes{open ? ` (${open} open)` : ''}</div>
      {state === 'loading' && <LoadingState label="Loading disputes…" />}
      {state === 'error' && <ErrorState message="Could not load transport disputes." onRetry={load} />}
      {state === 'ready' && sorted.length === 0 && <Card><p style={{ margin: 0, fontSize: 13, color: T.muted }}>No transport disputes.</p></Card>}
      {state === 'ready' && sorted.map(d => {
        const resolvable = ['OPEN', 'RESPONDED'].includes(d.status);
        return (
          <Card key={d.id} style={{ marginBottom: 10 }}>
            <div data-testid="admin-dispute" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 800 }}>{d.disputeNumber} · {categoryLabel(d.category)} <span style={{ color: T.muted, fontWeight: 600 }}>· {d.status}</span></div>
                <div>Raised by the {d.raisedByRole === 'REQUESTER' ? 'requester' : 'transporter'}: “{d.description}”{d.claimAmount ? ` · claim ${money(d.claimAmount)}` : ''}</div>
                {d.response && <div>Response: “{d.response}”</div>}
                {d.status === 'RESOLVED' && <div style={{ color: '#166534', fontWeight: 700 }}>{(OUTCOMES.find(([k]) => k === d.resolutionOutcome) || [, 'Resolved'])[1]}{d.resolutionNote ? ` — ${d.resolutionNote}` : ''}</div>}
              </div>
              {resolvable && <Btn variant="primary" size="sm" onClick={() => setResolving(d)}>Resolve</Btn>}
            </div>
          </Card>
        );
      })}
      {resolving && (
        <ConfirmDialog
          title={`Resolve ${resolving.disputeNumber}` } confirmLabel="Resolve dispute" confirmingLabel="Resolving…"
          description="Record the outcome. Both parties are notified and the shipment returns to its previous status."
          initialState={{ outcome: '' }}
          renderFields={(state, set) => (
            <>
              <label htmlFor="resolve-outcome" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Outcome *</label>
              <select id="resolve-outcome" style={input} value={state.outcome} onChange={e => set({ outcome: e.target.value })}>
                <option value="">Choose…</option>
                {OUTCOMES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </>
          )}
          reasonLabel="Resolution note (both parties will see it)" reasonRequired
          validate={(state, reason) => (!state.outcome ? 'Choose an outcome.' : reason.length < 5 ? 'Write a note of at least 5 characters.' : null)}
          onConfirm={({ state, reason }) => apiAdminResolveTransportDispute(resolving.id, { outcome: state.outcome, note: reason })}
          onClose={() => { setResolving(null); load(); }}
        />
      )}
    </div>
  );
}
