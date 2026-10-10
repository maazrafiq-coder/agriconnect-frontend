import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SELLER_ROLES } from '../lib/roles';

// Protected route wrapper
export default function ProtectedRoute({ children, requireSeller, requireAdmin, requireRole }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for session rehydration before deciding
  if (!user) return <Navigate to="/" replace />;
  if (requireAdmin && user.role !== 'admin' && user.role !== 'moderator') return <Navigate to="/" replace />;
  if (requireSeller && !SELLER_ROLES.includes(user.role)) return <Navigate to="/" replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;
  return children;
}
