// Notification / deep-link plumbing.
//
// A notification's `data` carries a structured destination (built by the
// backend's notifications/destinations.ts):
//     { route, tab, entityType, entityId, link }
// The destination is expressed as a URL (`/buyer?tab=offers&type=offer&id=…`),
// so it survives a refresh and can be opened in a new tab; dashboards read it
// back with useDeepLink().
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SELLER_ROLES, portalPathForRole } from './roles';

// Pages a signed-in person can legitimately open, by role.
function allowedRoutes(role) {
  const r = new Set(['/account', '/buyer', '/warehouse', '/marketplace', '/testing', '/transport']);
  if (SELLER_ROLES.includes(role)) r.add('/seller');
  if (role === 'warehouse') r.add('/warehouse-portal');
  if (role === 'testing_agency') r.add('/testing-portal');
  if (role === 'transporter') r.add('/transport-portal');
  if (role === 'admin' || role === 'moderator') r.add('/admin');
  return r;
}

function build(route, tab, type, id) {
  const qs = new URLSearchParams();
  if (tab) qs.set('tab', tab);
  if (type && id) { qs.set('type', type); qs.set('id', id); }
  const q = qs.toString();
  return q ? `${route}?${q}` : route;
}

// Where should this notification take THIS user?  Never returns a page the
// user cannot open, never returns a broken URL.
export function resolveNotificationTarget(n, user) {
  const d = n?.data || {};
  let route = d.route;
  let tab = d.tab;
  let type = d.entityType;
  let id = d.entityId;

  // Older notifications only have `link` ('/buyer', '/seller?tab=offers…').
  if (!route && typeof d.link === 'string' && /^\/(?![\/\\])/.test(d.link)) {
    const [path, query = ''] = d.link.split('?');
    route = path;
    const p = new URLSearchParams(query);
    tab = tab || p.get('tab') || undefined;
    type = type || p.get('type') || undefined;
    id = id || p.get('id') || d.offerId || d.orderId || d.requestId || d.bookingId || d.receiptId || d.productId || undefined;
    if (!type) {
      if (d.offerId) type = 'offer'; else if (d.orderId) type = 'order';
      else if (d.requestId) type = 'transport'; else if (d.bookingId) type = 'booking';
      else if (d.receiptId) type = 'receipt'; else if (d.productId) type = 'listing';
    }
  }
  if (!route) return null;

  const role = user?.role;
  if (!allowedRoutes(role).has(route)) {
    // e.g. a seller-side link opened by an account without seller access, or an
    // operator link on the wrong account: send them to their own portal.
    const home = portalPathForRole(role);
    return build(home, undefined, undefined, undefined);
  }
  return build(route, tab, type, id);
}

// Which tab shows each kind of record, when the URL names a record but no tab.
const TYPE_TAB = {
  offer: 'offers', order: 'orders', invoice: 'orders', transport: 'transport', testing: 'testing',
  listing: 'listings', booking: 'bookings', receipt: 'receipts', gateout: 'gateout',
};

// Reads ?tab=&type=&id= for a page.
//   validTabs : tab ids the page really has
//   setTab    : the page's own tab setter
//   lookup    : { [type]: { ready: bool, ids: string[] } } what has loaded so far
// Returns { focus, notice, dismiss }: `notice` is set when the record named
// by the link can't be found among what the person is allowed to see.
export function useDeepLink({ validTabs, setTab, lookup = {} }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab');
  const type = params.get('type');
  const id = params.get('id');
  const [dismissed, setDismissed] = useState(false);
  const appliedTab = useRef(null);

  useEffect(() => { setDismissed(false); }, [tab, type, id]);

  // 1) switch to the right tab once per link
  useEffect(() => {
    const wanted = tab || (type && TYPE_TAB[type]);
    const key = `${wanted}|${type}|${id}`;
    if (!wanted || appliedTab.current === key) return;
    if (!validTabs || validTabs.includes(wanted)) { setTab(wanted); appliedTab.current = key; }
  }, [tab, type, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const entry = type ? lookup[type] : null;
  const found = !!(entry && entry.ready && id && entry.ids.includes(id));
  const missing = !!(entry && entry.ready && id && !entry.ids.includes(id));

  // 2) once the record is on screen, bring it into view and flash it
  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-focus-id="${CSS.escape(id)}"]`);
      if (el?.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.animate?.([{ background: '#FEF9C3' }, { background: 'transparent' }], { duration: 2200 });
    }, 150);
    return () => clearTimeout(t);
  }, [found, id, tab]);

  const dismiss = () => {
    setDismissed(true);
    const next = new URLSearchParams(params);
    ['type', 'id'].forEach(k => next.delete(k));
    setParams(next, { replace: true });
  };

  const notice = missing && !dismissed
    ? { message: 'That item is no longer available, was removed, or isn’t part of your account. Here is everything else in this section.' }
    : null;
  return { focusId: found ? id : null, notice, dismiss, params: useMemo(() => ({ tab, type, id }), [tab, type, id]) };
}
