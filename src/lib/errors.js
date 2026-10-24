// Turns whatever an API call threw into something a screen can show - and
// react to - without guessing from message text.
//   auth       signed out / session expired      -> offer "Log in"
//   forbidden  signed in but not allowed         -> explain (e.g. not approved yet)
//   network    request never reached the server  -> "check connection, retry"
//   validation the server rejected the input     -> show the message next to the form
//   server     anything else (5xx, unknown)
export function describeError(e) {
  const status = e?.status;
  const raw = e?.message || '';
  if (e?.isNetwork) return { kind: 'network', message: raw || 'Network problem — please check your connection and try again.', retryable: true };
  if (status === 401 || raw === 'Unauthorized') return { kind: 'auth', message: 'Your session has expired. Please log in again — what you typed is still here.', retryable: false };
  if (status === 403) return { kind: 'forbidden', message: raw || 'You do not have permission to do this.', retryable: false };
  if (status >= 500) return { kind: 'server', message: raw || 'The server had a problem. Please try again in a moment.', retryable: true };
  if (status >= 400) return { kind: 'validation', message: raw || 'Please check the details and try again.', retryable: false };
  return { kind: 'server', message: raw || 'Something went wrong. Please try again.', retryable: true };
}

// Short random id for idempotency keys (one per submit intent).
export function newRequestId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
