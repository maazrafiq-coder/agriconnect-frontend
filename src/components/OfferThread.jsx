import { useState, useEffect, useRef } from 'react';
import { apiGetOfferMessages, apiPostOfferMessage } from '../lib/api';
import { Btn } from './ui';
import T from '../theme';

// Seller <-> buyer chat about one offer. Polls lightly so replies appear
// without a refresh.
export default function OfferThread({ offerId, closed = false }) {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const load = () =>
    apiGetOfferMessages(offerId)
      .then(d => { setMessages(Array.isArray(d) ? d : []); setError(''); })
      .catch(e => setError(e.message || 'Could not load messages.'));

  useEffect(() => {
    setMessages(null);
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [offerId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages?.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setError('');
    try { await apiPostOfferMessage(offerId, body); setText(''); await load(); }
    catch (e) { setError(e.message || 'Could not send your message.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 240, maxHeight: 360, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages === null && !error && <div style={{ fontSize: 12, color: T.muted }}>Loading conversation…</div>}
        {messages && messages.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No messages yet — say hello.</div>}
        {(messages || []).map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, background: m.mine ? T.green : T.surface, color: m.mine ? '#fff' : T.text }}>
              <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2 }}>
                {m.mine ? 'You' : m.senderName} · {new Date(m.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.border}` }}>
        {error && <p style={{ color: T.danger, fontSize: 12, margin: '0 0 6px' }}>{error}</p>}
        {closed ? (
          <div style={{ fontSize: 12, color: T.muted }}>This offer is closed, so the conversation is read-only.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Type a message…"
              onKeyDown={e => e.key === 'Enter' && !busy && send()}
              style={{ flex: 1, padding: '9px 13px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <Btn variant="primary" disabled={busy || !text.trim()} onClick={send}>{busy ? '…' : 'Send'}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
