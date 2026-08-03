import { createContext, useContext, useState, useEffect } from 'react';
import { apiGetMe, apiLogin, apiLogout, clearTokens, setAccessToken } from '../lib/api';
import { adaptUser } from '../lib/adapters';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const openLogin    = () => setAuthModal('login');
  const openRegister = () => setAuthModal('register');
  const closeModal   = () => setAuthModal(null);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithUser, logout, authModal, openLogin, openRegister, closeModal }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
