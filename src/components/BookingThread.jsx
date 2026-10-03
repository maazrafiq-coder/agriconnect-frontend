import { useState, useEffect, useRef } from 'react';
import { apiGetBookingMessages, apiPostBookingMessage } from '../lib/api';
import { Btn } from './ui';
import T from '../theme';

// Conversation between a depositor and the warehouse operator, scoped to one
// storage booking. `isOperator` unlocks the "request more information"
// toggle — those messages are highlighted so the depositor can't miss that
// the warehouse is waiting on them.
export default function BookingThread({ bookingId, isOperator = false, closed = false }) {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [asInfoRequest, setAsInfoRequest] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const load = () =>
    apiGetBookingMessages(bookingId)
      .then(d => { setMessages(Array.isArray(d) ? d : []); setError(''); })
      .catch(e => setError(e.message || 'Could not load messages.'));

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // light polling so replies show up without a refresh
    return () => clearInterval(t);
  }, [bookingId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages?.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setError('');
    try {
      await apiPostBookingMessage(bookingId, body, isOperator && asInfoRequest ? 'INFO_REQUEST' : 'MESSAGE');
      setText(''); setAsInfoRequest(false);
      await load();
    } catch (e) {
      setError(e.message || 'Could not send your message.');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div style={{ maxHeight: 260, overflowY: 'auto', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
        {messages === null && !error && <div style={{ fontSize: 12, color: T.muted }}>Loading conversation…</div>}
        {messages && messages.length === 0 && (
          <div style={{ fontSize: 12, color: T.muted }}>
            No messages yet.{isOperator ? ' Tick "Request more information" to ask the depositor for anything missing.' : ' Ask the warehouse anything about this booking.'}
          </div>
        )}
        {(messages || []).map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <div style={{
              maxWidth: '80%', padding: '7px 11px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.5,
              background: m.kind === 'INFO_REQUEST' ? '#FFFBEB' : m.mine ? '#EFFDF5' : '#fff',
              border: `1px solid ${m.kind === 'INFO_REQUEST' ? '#FCD34D' : T.border}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, marginBottom: 2 }}>
                {m.mine ? 'You' : m.senderName} · {new Date(m.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {m.kind === 'INFO_REQUEST' && <span style={{ color: '#B45309' }}> · ❓ Information requested</span>}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: T.text }}>{m.body}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {closed ? (
        <div style={{ fontSize: 12, color: T.muted }}>This booking is closed, so the conversation is read-only.</div>
      ) : (
        <>
          <textarea
            value={text} onChange={e => setText(e.target.value)} maxLength={2000}
            placeholder={isOperator && asInfoRequest ? 'What do you need from the depositor? (e.g. variety, moisture level, packaging)' : 'Write a message…'}
            style={{ width: '100%', minHeight: 56, padding: '8px 10px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
          />
          {error && <p style={{ color: T.danger, fontSize: 12, margin: '6px 0 0' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {isOperator ? (
              <label style={{ fontSize: 12, color: T.text, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={asInfoRequest} onChange={e => setAsInfoRequest(e.target.checked)} />
                Request more information
              </label>
            ) : <span />}
            <Btn variant="primary" size="sm" disabled={busy || !text.trim()} onClick={send}>{busy ? 'Sending…' : asInfoRequest ? 'Send request' : 'Send'}</Btn>
          </div>
        </>
      )}
    </div>
  );
}
