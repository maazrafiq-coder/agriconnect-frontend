// src/components/ClarificationThread.jsx
//
// Two-way conversation between a reviewer (admin / moderator) and the person
// under review (KYC applicant or provider listing owner). One component for
// both sides, so each sees the SAME history in the SAME order.
//
// Behaviour that matters:
//   * every message is its own row, oldest first, labelled with who sent it;
//   * a reply appears in the thread as soon as the server confirmed it (it is
//     shown from the server's answer even before the list is re-fetched, and
//     de-duplicated against the re-fetched copy by its request id);
//   * Send locks while in flight and each Send intent carries ONE idempotency
//     key - a double-click, or a retry after a timeout, can never create two
//     messages, and a retry of something that actually succeeded just shows it;
//   * on failure the typed text and chosen files stay, and the error says
//     whether the session expired, the network dropped, or the server refused;
//   * `onRespond(clarificationId, message, files, clientRequestId)` must
//     resolve only after the server accepted the message.
import { useRef, useState } from 'react';
import { Btn } from './ui';
import { apiGetClarificationAttachmentUrl, resolveApiFileUrl } from '../lib/api';
import { describeError, newRequestId } from '../lib/errors';
import T from '../theme';

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

const STATUS_BADGE = {
  subject: {
    OPEN:      { bg: '#FFEDD5', fg: '#C2410C', label: 'Awaiting your response' },
    RESPONDED: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Sent — awaiting review' },
    RESOLVED:  { bg: '#DCFCE7', fg: '#15803D', label: 'Resolved' },
  },
  reviewer: {
    OPEN:      { bg: '#FFEDD5', fg: '#C2410C', label: 'Waiting for the applicant' },
    RESPONDED: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Applicant replied' },
    RESOLVED:  { bg: '#DCFCE7', fg: '#15803D', label: 'Resolved' },
  },
};

// Older API responses (or rows not yet migrated) carry only requestMessage /
// responseMessage; show them as a two-message thread instead of dropping them.
export function threadMessages(c) {
  if (c.messages?.length) return c.messages;
  const out = [{ id: `req-${c.id}`, senderRole: 'REVIEWER', body: c.requestMessage, createdAt: c.createdAt, attachments: [] }];
  if (c.responseMessage) out.push({ id: `res-${c.id}`, senderRole: 'SUBJECT', body: c.responseMessage, createdAt: c.respondedAt || c.createdAt, attachments: c.attachments || [] });
  return out;
}

function AttachmentLink({ clarificationId, attachment }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = async () => {
    setBusy(true); setFailed(false);
    try {
      const { url } = await apiGetClarificationAttachmentUrl(clarificationId, attachment.id);
      window.open(resolveApiFileUrl(url), '_blank', 'noopener');
    } catch {
      setFailed(true); // a failed link says so instead of silently doing nothing
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button" onClick={open} disabled={busy}
      style={{ background: T.surface, border: `1px solid ${failed ? T.danger : T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, color: failed ? T.danger : T.text, cursor: busy ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
    >
      📎 {attachment.fileName}{failed ? ' — could not open, tap to retry' : ''}
    </button>
  );
}

function Message({ m, clarificationId, mine, viewerRole }) {
  const fromReviewer = m.senderRole === 'REVIEWER';
  const who = mine ? 'You' : (m.senderName || (fromReviewer ? 'AgriConnect review team' : 'Applicant'));
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '88%', background: mine ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${mine ? '#A7F3D0' : T.border}`, borderRadius: 10, padding: '9px 12px' }}>
        <div style={{ fontSize: 10.5, color: T.muted, fontWeight: 700, marginBottom: 3 }}>
          {who}{fromReviewer && !mine ? ' · Reviewer' : ''} · {fmtDateTime(m.createdAt)}
          {m.pending && <span style={{ color: T.warnText }}> · saving…</span>}
        </div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</div>
        {!!m.attachments?.length && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {m.attachments.map(a => (a.id ? <AttachmentLink key={a.id} clarificationId={clarificationId} attachment={a} /> : <span key={a.fileName} style={{ fontSize: 11.5, color: T.muted }}>📎 {a.fileName}</span>))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReplyForm({ clarification, viewerRole, onRespond, onSent }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const lock = useRef(false);
  // ONE key per send intent. It survives a failed attempt (the request may
  // have reached the server even though the reply was lost) and is replaced
  // only after a confirmed success or when the person changes the content.
  const keyRef = useRef({ id: null, sig: '' });

  const sig = () => `${message.trim()}|${files.map(f => `${f.name}:${f.size}`).join(',')}`;

  const submit = async () => {
    if (lock.current) return; // synchronous guard: two fast clicks = one request
    setJustSent(false);
    const text = message.trim();
    if (text.length < 2) { setError({ kind: 'validation', message: 'Please write a response.' }); return; }
    lock.current = true; setSending(true); setError(null);
    if (keyRef.current.sig !== sig() || !keyRef.current.id) keyRef.current = { id: newRequestId(), sig: sig() };
    const reqId = keyRef.current.id;
    try {
      const saved = await onRespond(clarification.id, text, files, reqId);
      onSent({ reqId, body: text, files, saved });
      keyRef.current = { id: null, sig: '' };
      setMessage(''); setFiles([]); setJustSent(true);
    } catch (e) {
      setError(describeError(e)); // text + files stay exactly as typed
    } finally {
      lock.current = false; setSending(false);
    }
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${T.border}` }}>
      <label htmlFor={`clar-reply-${clarification.id}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Your message</label>
      <textarea
        id={`clar-reply-${clarification.id}`}
        value={message}
        onChange={e => { setMessage(e.target.value); setJustSent(false); }}
        placeholder={viewerRole === 'reviewer' ? 'Write a follow-up…' : 'Type your response…'}
        disabled={sending}
        style={{ width: '100%', minHeight: 64, padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11.5, color: T.muted, cursor: sending ? 'not-allowed' : 'pointer', border: `1px dashed ${T.border}`, borderRadius: 6, padding: '5px 10px' }}>
          📎 Attach file(s)
          <input type="file" multiple accept="image/jpeg,image/png,application/pdf" disabled={sending} style={{ display: 'none' }}
            onChange={e => setFiles(Array.from(e.target.files || []))} />
        </label>
        {files.length > 0 && <span style={{ fontSize: 11.5, color: T.muted }}>{files.map(f => f.name).join(', ')}</span>}
        <div style={{ flex: 1 }} />
        <Btn variant="primary" size="sm" disabled={sending} aria-busy={sending} onClick={submit}>{sending ? 'Sending…' : 'Send Response'}</Btn>
      </div>
      <div aria-live="polite" style={{ minHeight: 16 }}>
        {justSent && <p style={{ color: T.tealText, fontSize: 12, margin: '8px 0 0', fontWeight: 700 }}>✓ Sent — your message is in the conversation above.</p>}
        {error && <p role="alert" style={{ color: T.danger, fontSize: 12, margin: '8px 0 0' }}>{error.message}</p>}
      </div>
    </div>
  );
}

export default function ClarificationThread({ clarifications = [], viewerRole, onRespond, onResolve }) {
  // Messages confirmed by the server but possibly not yet in the re-fetched list.
  const [confirmed, setConfirmed] = useState({}); // clarificationId -> [message]
  if (!clarifications.length) return null;
  const badges = STATUS_BADGE[viewerRole] || STATUS_BADGE.subject;
  const myRole = viewerRole === 'reviewer' ? 'REVIEWER' : 'SUBJECT';

  const onSent = (cid) => ({ reqId, body, files, saved }) => {
    // Prefer the server's own copy of the message; fall back to what was sent.
    const fromServer = saved?.messages?.find?.(m => m.clientRequestId === reqId);
    const msg = fromServer || { id: `local-${reqId}`, clientRequestId: reqId, senderRole: myRole, body, createdAt: new Date().toISOString(), attachments: files.map(f => ({ fileName: f.name })) };
    setConfirmed(prev => ({ ...prev, [cid]: [...(prev[cid] || []), msg] }));
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {clarifications.map(c => {
        const badge = badges[c.status] || badges.OPEN;
        const server = threadMessages(c);
        const seen = new Set(server.map(m => m.clientRequestId).filter(Boolean));
        const extra = (confirmed[c.id] || []).filter(m => !seen.has(m.clientRequestId));
        const messages = [...server, ...extra].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const canRespond = !!onRespond && c.status !== 'RESOLVED';
        const canResolve = viewerRole === 'reviewer' && c.status === 'RESPONDED' && !!onResolve;
        return (
          <section key={c.id} aria-label="Conversation" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, background: T.white }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, color: T.muted, fontWeight: 700 }}>Started {fmtDateTime(c.createdAt)}</span>
              <span style={{ background: badge.bg, color: badge.fg, padding: '2px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{badge.label}</span>
            </div>

            <div role="log" aria-label="Messages" style={{ display: 'grid', gap: 8 }}>
              {messages.map(m => (
                <Message key={m.id} m={m} clarificationId={c.id} mine={m.senderRole === myRole} viewerRole={viewerRole} />
              ))}
            </div>

            {canRespond && <ReplyForm clarification={c} viewerRole={viewerRole} onRespond={onRespond} onSent={onSent(c.id)} />}

            {canResolve && (
              <div style={{ marginTop: 10, textAlign: 'right' }}>
                <Btn variant="secondary" size="sm" onClick={() => onResolve(c.id)}>Mark Resolved</Btn>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
