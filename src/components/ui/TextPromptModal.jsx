import { useState } from 'react';
import { Modal, Btn } from './index';
import T from '../../theme';

// Replacement for window.prompt() in admin flows: required text, inline
// validation, busy state, Cancel — and it doesn't vanish if the tab loses focus.
export default function TextPromptModal({ title, description, label, placeholder, submitLabel = 'Submit', multiline = true, onSubmit, onClose }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!value.trim()) { setError('This field is required.'); return; }
    setBusy(true); setError('');
    try { await onSubmit(value.trim()); onClose(); }
    catch (e) { setError(e?.message || 'Something went wrong.'); setBusy(false); }
  };

  const fieldStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  return (
    <Modal title={title} onClose={onClose}>
      {description && <p style={{ fontSize: 13, color: T.muted, margin: '0 0 12px', lineHeight: 1.5 }}>{description}</p>}
      <label htmlFor="textpromptmodal-f1" style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>{label}</label>
      {multiline
        ? <textarea id="textpromptmodal-f1" autoFocus rows={4} value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} style={{ ...fieldStyle, resize: 'vertical' }} />
        : <input autoFocus value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} onKeyDown={e => e.key === 'Enter' && submit()} style={fieldStyle} />}
      {error && <div style={{ color: T.danger, fontSize: 12, marginTop: 6 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? 'Working…' : submitLabel}</Btn>
      </div>
    </Modal>
  );
}
