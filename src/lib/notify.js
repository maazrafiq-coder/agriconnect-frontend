// Non-blocking replacement for window.alert(). notify(message[, 'error'|'success'])
// raises a dismissible banner rendered once by <NoticeHost /> (components/ui/NoticeHost.jsx).
export const NOTICE_EVENT = 'agri:notice';
export function notify(text, kind = 'error') {
  if (!text || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: { text: String(text), kind } }));
}
