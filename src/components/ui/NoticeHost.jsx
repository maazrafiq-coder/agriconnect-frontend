import { useEffect, useRef, useState } from 'react';
import { NOTICE_EVENT } from '../../lib/notify';

export default function NoticeHost({ ttlMs = 8000 }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  useEffect(() => {
    const on = (e) => {
      setMsg(e.detail);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), ttlMs);
    };
    window.addEventListener(NOTICE_EVENT, on);
    return () => { window.removeEventListener(NOTICE_EVENT, on); clearTimeout(timer.current); };
  }, [ttlMs]);
  if (!msg) return null;
  const err = msg.kind === 'error';
  return (
    <div role={err ? 'alert' : 'status'} style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 3000, maxWidth: 'min(520px, calc(100vw - 32px))',
      background: err ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${err ? '#FECACA' : '#86EFAC'}`, color: err ? '#B91C1C' : '#15803D',
      borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 4px 16px rgba(0,0,0,.15)',
    }}>
      <span style={{ flex: 1 }}>{err ? '⚠ ' : ''}{msg.text}</span>
      <button type="button" aria-label="Dismiss" onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}
