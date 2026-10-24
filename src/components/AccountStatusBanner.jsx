// Site-wide strip shown to signed-in people whose account is not approved yet.
// Says exactly where they stand and what to do next; disappears on approval.
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accessInfo } from '../lib/access';
import { Btn } from './ui';

const TONES = {
  info:   { bg: '#EFF6FF', border: '#BFDBFE', fg: '#1E40AF' },
  warn:   { bg: '#FFF7ED', border: '#FDBA74', fg: '#9A3412' },
  danger: { bg: '#FEF2F2', border: '#FECACA', fg: '#991B1B' },
};

export default function AccountStatusBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const a = accessInfo(user);
  if (!a.signedIn || a.approved || !a.info) return null;
  // On the account page the same information is shown in full; avoid doubling up.
  if (pathname === '/account') return null;
  const t = TONES[a.info.tone] || TONES.info;
  return (
    <div role="status" style={{ background: t.bg, borderBottom: `1px solid ${t.border}`, color: t.fg }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '9px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span aria-hidden="true">{a.info.icon}</span>
        <div style={{ flex: 1, minWidth: 220, fontSize: 12.5, lineHeight: 1.5 }}>
          <strong>{a.info.title}.</strong> You can browse; transactions are locked until approval.
        </div>
        {a.info.cta && <Btn size="sm" variant="secondary" onClick={() => navigate(a.info.cta.to)}>{a.info.cta.label}</Btn>}
      </div>
    </div>
  );
}
