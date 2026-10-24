import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveNotificationTarget } from '../lib/deeplink';
import {
  apiGetNotifications, apiGetUnreadNotificationCount,
  apiMarkNotificationRead, apiMarkAllNotificationsRead,
} from '../lib/api';
import T from '../theme';
import { clickable } from '../lib/a11y';

function timeAgo(d) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const ICONS = {
  LOAN_UPDATE: '🏦', WAREHOUSE_UPDATE: '🏪', KYC_UPDATE: '🪪', ORDER_UPDATE: '📋', OFFER_RECEIVED: '💬',
  OFFER_ACCEPTED: '🤝', OFFER_REJECTED: '❌', TESTING_UPDATE: '🧪', TRANSPORT_UPDATE: '🚚', PAYMENT_RECEIVED: '💰', PAYMENT_DUE: '⏰', SYSTEM: '🔔',
};

// Bell in the navbar: polls the unread count, loads the list when opened,
// and deep-links to the destination in each notification's `data`
// (route + tab + record id; see lib/deeplink.js). The destination lives in the
// URL, so it keeps working after a refresh.
export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [markFailed, setMarkFailed] = useState({});   // id -> true when "mark as read" did not reach the server
  const [noDest, setNoDest] = useState('');
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const ref = useRef(null);

  const refreshCount = () =>
    apiGetUnreadNotificationCount().then(r => setUnread(r?.count || 0)).catch(() => {});

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError('');
    apiGetNotifications(20).then(d => setItems(Array.isArray(d) ? d : [])).catch(e => setError(e.message || 'Could not load notifications.'));
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const markRead = async (n) => {
    setItems(list => (list || []).map(x => x.id === n.id ? { ...x, isRead: true } : x));
    setUnread(c => Math.max(0, c - 1));
    setMarkFailed(f => { const { [n.id]: _drop, ...rest } = f; return rest; });
    try {
      await apiMarkNotificationRead(n.id);
    } catch {
      // Don't pretend it was read: put it back as unread and offer a retry.
      setItems(list => (list || []).map(x => x.id === n.id ? { ...x, isRead: false } : x));
      setUnread(c => c + 1);
      setMarkFailed(f => ({ ...f, [n.id]: true }));
    }
  };

  const openItem = (n) => {
    const target = resolveNotificationTarget(n, user);
    if (!n.isRead) markRead(n); // fire and forget; failure is surfaced on the item
    if (target) {
      setNoDest('');
      setOpen(false);
      navigate(target);
    } else {
      // Nothing to open: keep the panel open and say so instead of doing nothing.
      setNoDest(n.id);
    }
  };

  const markAll = async () => {
    try {
      await apiMarkAllNotificationsRead();
      setItems(list => (list || []).map(x => ({ ...x, isRead: true })));
      setUnread(0);
    } catch { /* leave as is; next poll will correct the badge */ }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        style={{ position: 'relative', background: open ? 'rgba(255,255,255,0.16)' : 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, maxWidth: '92vw', background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: `1px solid ${T.border}` }}>
            <strong style={{ fontSize: 13, color: T.green }}>Notifications</strong>
            {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none', color: T.mid, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {items === null && !error && <div style={{ padding: 18, fontSize: 12, color: T.muted }}>Loading…</div>}
            {error && <div style={{ padding: 18, fontSize: 12, color: T.danger }}>{error}</div>}
            {items && items.length === 0 && <div style={{ padding: 22, fontSize: 12.5, color: T.muted, textAlign: 'center' }}>You're all caught up.</div>}
            {(items || []).map(n => (
              <div
                key={n.id} {...clickable(() => openItem(n))}
                style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: n.isRead ? '#fff' : '#F0FDF4' }}
              >
                <div style={{ fontSize: 18, lineHeight: 1.2 }}>{ICONS[n.type] || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: n.isRead ? 600 : 800, color: T.text }}>{n.title}</div>
                    <div style={{ fontSize: 10, color: T.muted, whiteSpace: 'nowrap' }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.45 }}>{n.body}</div>
                  {noDest === n.id && <div role="status" style={{ fontSize: 11, color: T.warnText, marginTop: 3 }}>This notification has no page to open.</div>}
                  {markFailed[n.id] && (
                    <div role="alert" style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>
                      Couldn’t mark as read.{' '}
                      <button type="button" onClick={(e) => { e.stopPropagation(); markRead(n); }} style={{ background: 'none', border: 'none', color: T.danger, textDecoration: 'underline', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit' }}>Retry</button>
                    </div>
                  )}
                </div>
                {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, marginTop: 5, flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
