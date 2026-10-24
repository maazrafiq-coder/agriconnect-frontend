// A single place that decides "may this person start a transaction?" for any
// button: guests are sent to log in; signed-in but not-yet-approved people get
// a clear explanation (not a failing form); approved people proceed.
//
//   const gate = useApprovalGate();
//   <Btn onClick={gate(() => setOfferModal(true), 'make an offer')}>Make an offer</Btn>
//
// Also exposes `approved` for places that prefer to show a disabled state.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { accessInfo } from '../lib/access';
import { Modal, Btn } from '../components/ui';
import T from '../theme';

const GateContext = createContext(null);

export function ApprovalGateProvider({ children }) {
  const { user, openLogin } = useAuth();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(null); // { action }
  const access = accessInfo(user);

  const gate = useCallback((fn, action = 'do this') => (...args) => {
    if (!user) { openLogin(); return undefined; }
    if (!access.approved) { setBlocked({ action }); return undefined; }
    return fn?.(...args);
  }, [user, access.approved, openLogin]);

  const value = useMemo(() => ({ gate, approved: access.approved, access }), [gate, access]);

  return (
    <GateContext.Provider value={value}>
      {children}
      {blocked && access.info && (
        <Modal title="Approval needed" onClose={() => setBlocked(null)} width={440}>
          <div style={{ fontSize: 34, marginBottom: 8 }} aria-hidden="true">{access.info.icon}</div>
          <p style={{ fontSize: 14, fontWeight: 800, color: T.green, margin: '0 0 8px' }}>You can't {blocked.action} yet</p>
          <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, margin: '0 0 8px' }}>{access.info.title}.</p>
          <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6, margin: '0 0 18px' }}>{access.info.message}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setBlocked(null)}>Keep browsing</Btn>
            {access.info.cta && <Btn variant="primary" onClick={() => { setBlocked(null); navigate(access.info.cta.to); }}>{access.info.cta.label}</Btn>}
          </div>
        </Modal>
      )}
    </GateContext.Provider>
  );
}

export function useApprovalGate() {
  const ctx = useContext(GateContext);
  if (!ctx) {
    // Outside a provider (e.g. an isolated component test) behave as "allowed"
    // — the server is the real enforcement point.
    return Object.assign((fn) => (...a) => fn?.(...a), { approved: true });
  }
  const g = (fn, action) => ctx.gate(fn, action);
  g.approved = ctx.approved;
  g.access = ctx.access;
  return g;
}
