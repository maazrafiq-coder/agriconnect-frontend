// src/components/ui/ConfirmDialog.jsx
//
// Replacement for window.confirm() / window.prompt() on actions that create a
// transaction, change terms, reject something or can't be undone. Unlike a
// native dialog it:
//   * states the actual consequences (`consequences`, `rows`);
//   * can collect a reason (`reasonLabel`, required or optional) and other
//     fields (`children`, receiving a { value } getter via `renderFields`);
//   * locks while the request is in flight and survives a failure with the
//     input intact;
//   * optionally ends on a success screen with a single Done button
//     (`success`) when the outcome deserves one.
// Low-risk, reversible clicks should stay one-click; don't wrap them in this.
import { useRef, useState } from 'react';
import T from '../../theme';
import { Modal, Btn } from './index';
import { FlowError, SummaryRows } from './RequestFlowModal';
import { describeError } from '../../lib/errors';

const fieldStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

export default function ConfirmDialog({
  title,
  description,
  rows,
  consequences,
  danger = false,
  confirmLabel = 'Confirm',
  confirmingLabel = 'Working…',
  cancelLabel = 'Cancel',
  reasonLabel,
  reasonRequired = false,
  reasonPlaceholder,
  renderFields,      // (state, setState) => node : extra inputs (e.g. payment reference)
  initialState = {},
  validate,          // (state, reason) => string | null
  confirmDisabled,   // (state, reason) => boolean : keeps the confirm button disabled (e.g. until a tick-box is ticked)
  onConfirm,         // async ({ reason, state }) => result
  success,           // (result) => { title, message, reference, rows } | undefined -> shows a success screen
  onClose,
  onDone,
  onLogin,
  width = 460,
}) {
  const [reason, setReason] = useState('');
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(false);
  const lock = useRef(false);

  const submit = async () => {
    if (lock.current) return;
    if (reasonRequired && !reason.trim()) { setError({ kind: 'validation', message: `${reasonLabel || 'A reason'} is required.` }); return; }
    const problem = validate ? validate(state, reason.trim()) : null;
    if (problem) { setError({ kind: 'validation', message: problem }); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const res = await onConfirm({ reason: reason.trim(), state });
      const s = success ? success(res) : null;
      if (s) { setResult(s); setDone(true); } else { onClose?.(); }
    } catch (e) {
      setError(describeError(e));
    } finally {
      lock.current = false; setBusy(false);
    }
  };

  if (done && result) {
    return (
      <Modal title={title} onClose={onClose} width={width}>
        <div role="status" style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 10 }}>{result.icon || '✅'}</div>
          <h3 style={{ color: T.green, margin: '0 0 8px' }}>{result.title || 'Done'}</h3>
          {result.reference && <div style={{ display: 'inline-block', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 800, color: T.green, marginBottom: 10 }}>{result.reference}</div>}
          {result.message && <p style={{ color: T.muted, fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>{result.message}</p>}
          {result.rows?.length > 0 && <div style={{ background: T.surface, borderRadius: 10, padding: 14, margin: '0 0 16px', textAlign: 'left' }}><SummaryRows rows={result.rows} /></div>}
          <Btn variant="primary" onClick={onDone || onClose}>Done</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} onClose={() => { if (!lock.current) onClose?.(); }} width={width}>
      {description && <p style={{ fontSize: 13, color: T.text, margin: '0 0 12px', lineHeight: 1.55 }}>{description}</p>}
      {rows?.length > 0 && <div style={{ background: T.surface, borderRadius: 10, padding: '4px 14px', marginBottom: 12 }}><SummaryRows rows={rows} /></div>}
      {consequences?.length > 0 && (
        <div style={{ background: danger ? '#FEF2F2' : '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: danger ? '#991B1B' : '#92400E' }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{danger ? 'This cannot be undone' : 'What this does'}</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>{consequences.map(c => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
      {renderFields && <div style={{ marginBottom: 12 }}>{renderFields(state, (patch) => setState(s => ({ ...s, ...patch })))}</div>}
      {reasonLabel && (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="confirmdialog-reason" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>{reasonLabel}{reasonRequired ? ' *' : ' (optional)'}</label>
          <textarea id="confirmdialog-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder={reasonPlaceholder} style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
      )}
      <FlowError error={error} onLogin={onLogin} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy}>{cancelLabel}</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={submit} disabled={busy || !!confirmDisabled?.(state, reason.trim())} aria-busy={busy}>{busy ? confirmingLabel : confirmLabel}</Btn>
      </div>
    </Modal>
  );
}
