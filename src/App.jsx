import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { LoginModal, RegisterModal } from './components/auth/AuthModals';

import HomePage         from './pages/HomePage';
import MarketplacePage  from './pages/MarketplacePage';
import ProductDetailPage from './pages/ProductDetailPage';
import { TestingPage, TransportPage } from './pages/ServicePages';
import WarehousePage from './pages/WarehousePage';
import SellerDashboard  from './pages/SellerDashboard';
import BuyerDashboard   from './pages/BuyerDashboard';
import AdminDashboard   from './pages/AdminDashboard';

// Backend UserRole enum values that count as "seller" for route-guard
// purposes. adaptUser() lowercases the raw enum (TRADER -> 'trader'),
// so this must be checked against the enum's actual values, not the
// literal string 'seller' (which isn't a UserRole value at all).
const SELLER_ROLES = ['trader', 'farmer', 'miller'];

// Protected route wrapper
function ProtectedRoute({ children, requireSeller, requireAdmin }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for session rehydration before deciding
  if (!user) return <Navigate to="/" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/" replace />;
  if (requireSeller && !SELLER_ROLES.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Inner app — needs auth context available
function AppInner() {
  const { authModal } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"            element={<HomePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/testing"     element={<TestingPage />} />
        <Route path="/transport"   element={<TransportPage />} />
        <Route path="/warehouse"   element={<WarehousePage />} />
        <Route path="/seller"      element={<ProtectedRoute requireSeller><SellerDashboard /></ProtectedRoute>} />
        <Route path="/buyer"       element={<ProtectedRoute><BuyerDashboard /></ProtectedRoute>} />
        <Route path="/admin"       element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global auth modals */}
      {authModal === 'login'    && <LoginModal />}
      {authModal === 'register' && <RegisterModal />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
