// What a signed-in person may do, derived from their KYC status.
//
// The BACKEND enforces this on every state-changing route (ApprovedUserGuard,
// see backend docs/PERMISSIONS_MATRIX.md). This module only decides what the
// UI shows and explains, so a person is never led through a form that the
// server would refuse.
export const APPROVED = 'APPROVED';

const STATES = {
  SUBMITTED: {
    tone: 'info', label: 'Under review', icon: '⏳',
    title: 'Your account is waiting for admin approval',
    message: 'You can browse the marketplace and your documents are with our team. Making offers, listing, booking and other transactions unlock once you are approved — you do not need to register again.',
    cta: { label: 'View my verification status', to: '/account' },
  },
  RECOMMENDED: {
    tone: 'info', label: 'Final review', icon: '⏳',
    title: 'Your account is in final review',
    message: 'A moderator has reviewed your registration and recommends approval. An admin gives the final decision; transactions unlock as soon as it is approved.',
    cta: { label: 'View my verification status', to: '/account' },
  },
  INFO_REQUESTED: {
    tone: 'warn', label: 'Action needed', icon: '✉️',
    title: 'The review team needs more information from you',
    message: 'Please read the request and reply. Until your account is approved you can browse, but not transact.',
    cta: { label: 'Open the request and reply', to: '/account' },
  },
  REJECTED: {
    tone: 'danger', label: 'Not approved', icon: '⛔',
    title: 'Your registration was not approved',
    message: 'You can still browse the marketplace. Read the reason on your account page; you can upload corrected documents there to have it reviewed again.',
    cta: { label: 'See the reason and next steps', to: '/account' },
  },
  PENDING: {
    tone: 'info', label: 'Verify phone', icon: '📱',
    title: 'Please finish verifying your phone number',
    message: 'Complete the OTP step to continue your registration.',
    cta: null,
  },
};

export function accessInfo(user) {
  if (!user) return { signedIn: false, approved: false, canTransact: false, state: null, info: null };
  const status = user.kycStatus;
  // A session without any kycStatus (older cached user objects) is not locked in
  // the UI - the server decides on every request, so the worst case is a clear
  // "approval needed" message from the API rather than a wrongly hidden button.
  const approved = status === APPROVED || status == null;
  return {
    signedIn: true,
    approved,
    canTransact: approved,
    state: approved ? APPROVED : status,
    info: approved ? null : (STATES[status] || STATES.SUBMITTED),
  };
}

// Where to land after login: approved people go to their portal; everyone else
// to where they can act (reply to the admin) or browse.
export function landingPathAfterLogin(user, portalPath) {
  const a = accessInfo(user);
  if (a.approved) return portalPath;
  if (a.state === 'INFO_REQUESTED' || a.state === 'REJECTED') return '/account';
  return '/marketplace';
}
