import T from '../../theme';
import { Modal as UIModal, Tabs, InfoRow as UIInfoRow } from '../ui';

// Demo/sample data is only ever shown when explicitly enabled — never as a
// silent substitute for a failed API call. See P0 #10 (misleading mock
// fallbacks) in the fix backlog.

// Inline error banner used inside action modals (booking, lien, insurance)
// so a failed request is always visible to the user instead of silently
// proceeding to a fake success screen.
export const ErrorBanner = ({ message, onLogin }) => {
  if (!message) return null;
  const isAuthError = /unauthor/i.test(message) || /log ?in/i.test(message);
  return (
    <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#B91C1C',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <span>⚠ {isAuthError ? 'Please log in to continue — your session has expired or you are not signed in.' : message}</span>
      {isAuthError && onLogin && (
        <button onClick={onLogin} style={{background:'#B91C1C',color:'#fff',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>Log In</button>
      )}
    </div>
  );
};

// Colors from theme.js + extras
export const amber = '#B45309';

export const purple = '#7C3AED';

// ─── DATA ─────────────────────────────────────────────────────────────────────


// ─── UTILITIES ─────────────────────────────────────────────────────────────────
// Shared primitives come from components/ui. This dialog is slightly wider by default.
export const Modal = (props) => <UIModal width={520} {...props} />;

export const StatusPill = ({ status }) => {
  const s = { active:{bg:'#DCFCE7',c:'#15803D',l:'Active'}, lien:{bg:'#FEF3C7',c:'#B45309',l:'Bank Lien'}, released:{bg:'#F3F4F6',c:'#6B7280',l:'Released'}, booked:{bg:'#DBEAFE',c:'#1D4ED8',l:'Booked'}, available:{bg:'#D1FAE5',c:'#059669',l:'Available'}, full:{bg:'#FEE2E2',c:'#DC2626',l:'Full'} };
  const t = s[status]||s.active;
  return <span style={{background:t.bg,color:t.c,padding:'3px 10px',borderRadius:12,fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{t.l}</span>;
};

export const Stars = ({ r }) => <span style={{color:T.goldText,fontSize:12}}>{'★'.repeat(Math.round(r))}{'☆'.repeat(5-Math.round(r))} <span style={{color:T.muted,fontSize:11}}>{r}</span></span>;

// Shared with every request/confirmation flow (components/ui).
export const InfoRow = UIInfoRow;

// Shared tab strip (role=tablist, arrow-key navigation) lives in components/ui.
export const TabBar = (props) => <Tabs {...props} />;

export const inputStyle = { width:'100%', padding:'9px 12px', border:`1.5px solid ${T.border}`, borderRadius:7, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

// ─── RECEIPT DETAIL MODAL ─────────────────────────────────────────────────────
export const LIEN_LABEL = { released:'Lien cleared', rejected:'Application declined', withdrawn:'Application withdrawn', defaulted:'Lien defaulted' };
