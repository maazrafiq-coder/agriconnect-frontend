// src/components/ClarificationThread.jsx
//
// Reusable request/respond/resolve thread UI (Round 2 Milestone 3). Used
// on the user's own Account page (as the subject) and in
// AdminUserDetailModal (as the reviewer). Built generically so the same
// component can be reused for provider profile review (warehouse/testing
// agency/transport) in a later milestone — it only needs a list of
// clarifications and a couple of callbacks, no subjectType-specific logic.
import { useState } from 'react';
import { Btn } from './ui';
import { apiGetClarificationAttachmentUrl, resolveApiFileUrl } from '../lib/api';
import T from '../theme';

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

const STATUS_BADGE = {
  OPEN:      { bg: '#FFEDD5', fg: '#C2410C', label: 'Awaiting your response' },
  RESPONDED: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Awaiting review' },
  RESOLVED:  { bg: '#DCFCE7', fg: '#15803D', label: 'Resolved' },
};

function AttachmentLink({ clarificationId, attachment }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const { url } = await apiGetClarificationAttachmentUrl(clarificationId, attachment.id);
      window.open(resolveApiFileUrl(url), '_blank', 'noopener');
    } catch {
      // signed-url fetch failing just means the click does nothing; not
      // worth a whole error banner for a single attachment link
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={open}
      disabled={busy}
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, color: T.text, cursor: busy ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
    >
      📎 {attachment.fileName}
    </button>
  );
}

function ReplyForm({ clarification, onRespond }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError('');
    if (message.trim().length < 2) return setError('Please write a response.');
    setSubmitting(true);
    try {
      await onRespond(clarification.id, message.trim(), files);
    } catch (e) {
      setError(e?.message || 'Could not send your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Type your response…"
        style={{ width: '100%', minHeight: 64, padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11.5, color: T.muted, cursor: 'pointer', border: `1px dashed ${T.border}`, borderRadius: 6, padding: '5px 10px' }}>
          📎 Attach file(s)
          <input
            type="file" multiple accept="image/jpeg,image/png,application/pdf"
            style={{ display: 'none' }}
            onChange={e => setFiles(Array.from(e.target.files || []))}
          />
        </label>
        {files.length > 0 && <span style={{ fontSize: 11.5, color: T.muted }}>{files.length} file(s) selected</span>}
        <div style={{ flex: 1 }} />
        <Btn variant="primary" size="sm" disabled={submitting} onClick={submit}>{submitting ? 'Sending…' : 'Send Response'}</Btn>
      </div>
      {error && <p style={{ color: T.danger, fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
    </div>
  );
}

export default function ClarificationThread({ clarifications = [], viewerRole, onRespond, onResolve }) {
  if (!clarifications.length) return null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {clarifications.map(c => {
        const badge = STATUS_BADGE[c.status] || STATUS_BADGE.OPEN;
        const canRespond = !!onRespond && c.status !== 'RESOLVED' && (viewerRole === 'reviewer' || (viewerRole === 'subject' && c.status === 'OPEN'));
        const canResolve = viewerRole === 'reviewer' && c.status === 'RESPONDED' && !!onResolve;
        return (
          <div key={c.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, background: T.white }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, color: T.muted, fontWeight: 700 }}>{fmtDateTime(c.createdAt)}</span>
              <span style={{ background: badge.bg, color: badge.fg, padding: '2px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{badge.label}</span>
            </div>

            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
              <strong style={{ color: T.green }}>Reviewer asked:</strong> {c.requestMessage}
            </div>

            {c.responseMessage && (
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}` }}>
                <strong>Response</strong> {c.respondedAt && <span style={{ fontWeight: 400, color: T.muted, fontSize: 11 }}>({fmtDateTime(c.respondedAt)})</span>}:<br />
                {c.responseMessage}
              </div>
            )}

            {!!c.attachments?.length && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {c.attachments.map(a => (
                  <AttachmentLink key={a.id} clarificationId={c.id} attachment={a} />
                ))}
              </div>
            )}

            {canRespond && <ReplyForm clarification={c} onRespond={onRespond} />}

            {canResolve && (
              <div style={{ marginTop: 10, textAlign: 'right' }}>
                <Btn variant="secondary" size="sm" onClick={() => onResolve(c.id)}>Mark Resolved</Btn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
