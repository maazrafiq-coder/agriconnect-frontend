import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Btn } from './ui';
import T from '../theme';

const SELLER_ROLES = ['trader', 'farmer', 'miller'];

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout, openLogin, openRegister } = useAuth();

  const links = [
    ['/', 'Home'],
    ['/marketplace', 'Marketplace'],
    ['/testing', 'Lab Testing'],
    ['/transport', 'Transport'],
    ['/warehouse', 'Warehouses'],
  ];

  return (
    <nav style={{ background: T.green, position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 58 }}>

        {/* Logo */}
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: 22 }}>🌾</span>
          <span style={{ color: T.bg, fontWeight: 900, fontSize: 16, letterSpacing: '-0.3px' }}>AgriConnect</span>
          <span style={{ color: T.gold, fontSize: 10, fontWeight: 700, background: 'rgba(183,160,90,0.2)', padding: '1px 6px', borderRadius: 4 }}>PK</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
          {links.map(([path, label]) => {
            const active = pathname === path || (path !== '/' && pathname.startsWith(path));
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  background: 'none', border: 'none',
                  color: active ? T.mint : 'rgba(255,255,255,0.72)',
                  padding: '8px 13px', cursor: 'pointer',
                  fontWeight: active ? 700 : 400, fontSize: 13,
                  fontFamily: 'inherit',
                  borderBottom: active ? `2px solid ${T.mint}` : '2px solid transparent',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {user ? (
            <>
              <button
                onClick={() => navigate(SELLER_ROLES.includes(user.role) ? '/seller' : '/buyer')}
                style={{ background: 'rgba(116,198,157,0.15)', border: '1px solid rgba(116,198,157,0.3)', color: T.mint, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}
              >
                {SELLER_ROLES.includes(user.role) ? '📦' : '🛒'} My Portal
              </button>
              <button
                onClick={logout}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.65)', padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openLogin}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.82)', padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}
              >
                Login
              </button>
              <Btn variant="gold" size="sm" onClick={openRegister}>Register Free</Btn>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
