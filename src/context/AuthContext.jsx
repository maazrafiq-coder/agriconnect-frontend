import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGetMe, apiLogin, apiLogout, setAccessToken } from '../lib/api';
import { adaptUser } from '../lib/adapters';

import { API_BASE as BASE } from '../lib/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [loading, setLoading]     = useState(true);

  // On boot, the access token lives only in memory and is lost on reload.
  // Silently try to mint a new one from the httpOnly refresh cookie before
  // giving up — this is what keeps the user logged in across page reloads
  // without ever putting a token in localStorage.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.accessToken) {
            setAccessToken(data.accessToken);
            const me = await apiGetMe();
            setUser(adaptUser(me));
          }
        }
      } catch {
        // No valid session — user stays logged out, which is correct.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (identifier, password) => {
    const result = await apiLogin({ identifier, password });
    const adapted = adaptUser(result.user);
    setUser(adapted);
    return adapted;
  };

  const loginWithUser = (adaptedUser) => setUser(adaptedUser);

  // Re-read the account from the server. An admin approving (or asking for
  // more information from) a signed-in person takes effect without them
  // logging in again.
  const refreshUser = useCallback(async () => {
    try {
      const me = await apiGetMe();
      setUser(prev => (prev ? adaptUser(me) : prev));
    } catch { /* keep the current view; the next poll retries */ }
  }, []);

  // While an account is not approved, check again every minute and whenever the
  // tab regains focus, so the banner and locked actions clear on approval.
  const needsPolling = !!user && user.kycStatus !== 'APPROVED' && !user.verified;
  useEffect(() => {
    if (!needsPolling) return undefined;
    const t = setInterval(refreshUser, 60000);
    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [needsPolling, refreshUser]);

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const openLogin    = () => setAuthModal('login');
  const openRegister = () => setAuthModal('register');
  const openForgot   = () => setAuthModal('forgot');
  const closeModal   = () => setAuthModal(null);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithUser, refreshUser, logout, authModal, openLogin, openRegister, openForgot, closeModal }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
