import { useState, useEffect, useCallback } from 'react';
import { apiAdminGetLiens, apiAdminConfirmLien, apiAdminRejectLien } from '../../lib/api';
import { Card, Btn, Modal, LoadingState } from '../ui';
import TextPromptModal from '../ui/TextPromptModal';
import T from '../../theme';

const STATUS_STYLE = {
  PENDING:   { bg: '#DBEAFE', c: '#1D4ED8', l: 'Pending' },
  ACTIVE:    { bg: '#FEF3C7', c: '#B45309', l: 'Active lien' },
  RELEASED:  { bg: '#F3F4F6', c: '#6B7280', l: 'Cleared' },
  REJECTED:  { bg: '#FEE2E2', c: '#B91C1C', l: 'Declined' },
  WITHDRAWN: { bg: '#F3F4F6', c: '#6B7280', l: 'Withdrawn' },
  DEFAULTED: { bg: '#FEE2E2', c: '#B91C1C', l: 'Defaulted' },
};
const fieldStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

function ConfirmModal({ lien, onClose, onDone }) {
  const [ref, setRef] = useState('');
  const [rate, setRate] = useState(lien.interestRate != null ? String(lien.interestRate) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (ref.trim().length < 3) { setError("Enter the bank's loan reference number."); return; }
    setBusy(true); setError('');
    try {
      await apiAdminConfirmLien(lien.id, { loanRefNo: ref.trim(), ...(rate !== '' && { interestRate: Number(rate) }), ...(note.trim() && { note: note.trim() }) });
      onDone();
    } catch (e) { setError(e?.message || 'Could not confirm.'); setBusy(false); }
  };
  return (
    <Modal title="Confirm loan & activate lien" onClose={onClose}>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
        Confirm only after the bank has approved <strong>₨{Number(lien.loanAmount).toLocaleString()}</strong> ({lien.bankName}) against receipt {lien.receipt?.receiptNumber}. This puts the goods under lien and records the disbursement.
      </p>
      <label htmlFor="adminlienqueue-f1" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Bank loan reference *</label>
      <input id="adminlienqueue-f1" autoFocus value={ref} onChange={e => setRef(e.target.value)} style={{ ...fieldStyle, marginBottom: 10 }} />
      <label htmlFor="adminlienqueue-f2" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Interest rate % p.a. (as approved by the bank)</label>
      <input id="adminlienqueue-f2" type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={{ ...fieldStyle, marginBottom: 10 }} />
      <label htmlFor="adminlienqueue-f3" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Note (optional)</label>
      <input id="adminlienqueue-f3" value={note} onChange={e => setNote(e.target.value)} style={fieldStyle} />
      {error && <div style={{ color: T.danger, fontSize: 12, marginTop: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? 'Working…' : 'Confirm & activate'}</Btn>
      </div>
    </Modal>
  );
}

export default function AdminLienQueue() {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await apiAdminGetLiens(status === 'ALL' ? undefined : status); setRows(Array.isArray(r) ? r : (r?.data || [])); }
    catch (e) { setError(e?.message || 'Failed to load applications.'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>🏦 Loan Applications & Liens</h1>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 16px' }}>Depositors apply against their warehouse receipts. Confirm once the bank has approved — nothing is booked as a loan until you do.</p>
      <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...fieldStyle, width: 'auto', marginBottom: 14 }}>
        {['PENDING', 'ACTIVE', 'RELEASED', 'REJECTED', 'WITHDRAWN', 'ALL'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'All' : STATUS_STYLE[s].l}</option>)}
      </select>
      {error && <div style={{ color: T.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {loading && <LoadingState />}
      {!loading && rows.length === 0 && <Card style={{ padding: 24, textAlign: 'center', color: T.muted }}>No applications in this view.</Card>}
      {rows.map(l => {
        const st = STATUS_STYLE[l.status] || { bg: '#eee', c: '#333', l: l.status };
        const owner = l.receipt?.owner;
        return (
          <Card key={l.id} style={{ marginBottom: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>₨{Number(l.loanAmount).toLocaleString()} · {l.bankName}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  Receipt {l.receipt?.receiptNumber} — {l.receipt?.quantityTons} t {l.receipt?.commodity} (value ₨{Number(l.receipt?.marketValue || 0).toLocaleString()}) · {l.receipt?.warehouse?.name}, {l.receipt?.warehouse?.city}
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  Depositor: {owner?.profile?.businessName || owner?.profile?.fullName || '—'}{owner?.phoneNumber ? ` · ${owner.phoneNumber}` : ''} · applied {String(l.placedAt).slice(0, 10)}
                </div>
                {l.loanRefNo && <div style={{ fontSize: 12 }}>Bank ref: <strong>{l.loanRefNo}</strong></div>}
                {l.decisionNote && <div style={{ fontSize: 12, color: T.muted }}>Note: {l.decisionNote}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <span style={{ background: st.bg, color: st.c, padding: '2px 9px', borderRadius: 9, fontSize: 11, fontWeight: 700 }}>{st.l}</span>
                {l.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn size="sm" onClick={() => setConfirming(l)}>Confirm</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setRejecting(l)}>Decline</Btn>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      {confirming && <ConfirmModal lien={confirming} onClose={() => setConfirming(null)} onDone={() => { setConfirming(null); load(); }} />}
      {rejecting && (
        <TextPromptModal
          title="Decline loan application"
          description="The depositor sees this reason, and their goods are released from hold."
          label="Reason"
          submitLabel="Decline"
          onSubmit={async (note) => { await apiAdminRejectLien(rejecting.id, note); load(); }}
          onClose={() => setRejecting(null)}
        />
      )}
    </div>
  );
}
