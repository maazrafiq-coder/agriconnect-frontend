import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AccountStatusBanner from './components/AccountStatusBanner';
import { ApprovalGateProvider } from './context/ApprovalGate';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingState } from './components/ui';
import HomePage from './pages/HomePage';

// Route-level code splitting: every page except Home is its own chunk.
const named = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })));
const LoginModal = named(() => import('./components/auth/AuthModals'), 'LoginModal');
const RegisterModal = named(() => import('./components/auth/AuthModals'), 'RegisterModal');
const ForgotPasswordModal = named(() => import('./components/auth/AuthModals'), 'ForgotPasswordModal');
const MarketplacePage  = lazy(() => import('./pages/MarketplacePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'));
const TestingPage   = named(() => import('./pages/ServicePages'), 'TestingPage');
const TransportPage = named(() => import('./pages/ServicePages'), 'TransportPage');
const WarehousePage = lazy(() => import('./pages/WarehousePage'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const BuyerDashboard  = lazy(() => import('./pages/BuyerDashboard'));
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'));
const AccountPage     = lazy(() => import('./pages/AccountPage'));
const WarehouseOperatorDashboard = lazy(() => import('./pages/WarehouseOperatorDashboard'));
const TestingAgencyDashboard     = lazy(() => import('./pages/TestingAgencyDashboard'));
const TransportProviderDashboard = lazy(() => import('./pages/TransportProviderDashboard'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const HelpPage     = named(() => import('./pages/InfoPages'), 'HelpPage');
const DisputesPage = named(() => import('./pages/InfoPages'), 'DisputesPage');
const ContactPage  = named(() => import('./pages/InfoPages'), 'ContactPage');
const TermsPage    = named(() => import('./pages/InfoPages'), 'TermsPage');
import ProtectedRoute from './components/ProtectedRoute';
import NoticeHost from './components/ui/NoticeHost';

// Inner app — needs auth context available
function AppInner() {
  const { authModal } = useAuth();
  return (
    <>
      <NoticeHost />
      <Navbar />
      <AccountStatusBanner />
      <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/"            element={<HomePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/seller/:id" element={<SellerProfilePage />} />
        <Route path="/testing"     element={<TestingPage />} />
        <Route path="/transport"   element={<TransportPage />} />
        <Route path="/warehouse"   element={<WarehousePage />} />
        <Route path="/seller"      element={<ProtectedRoute requireSeller><SellerDashboard /></ProtectedRoute>} />
        <Route path="/buyer"       element={<ProtectedRoute><BuyerDashboard /></ProtectedRoute>} />
        <Route path="/admin"       element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/account"     element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/warehouse-portal" element={<ProtectedRoute requireRole="warehouse"><WarehouseOperatorDashboard /></ProtectedRoute>} />
        <Route path="/testing-portal"   element={<ProtectedRoute requireRole="testing_agency"><TestingAgencyDashboard /></ProtectedRoute>} />
        <Route path="/transport-portal" element={<ProtectedRoute requireRole="transporter"><TransportProviderDashboard /></ProtectedRoute>} />
        <Route path="/help"        element={<HelpPage />} />
        <Route path="/disputes"    element={<DisputesPage />} />
        <Route path="/contact"     element={<ContactPage />} />
        <Route path="/terms"       element={<TermsPage />} />
        <Route path="/track/:id"   element={<TrackingPage />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

      {/* Global auth modals */}
      <Suspense fallback={null}>
        {authModal === 'login'    && <LoginModal />}
        {authModal === 'register' && <RegisterModal />}
        {authModal === 'forgot'   && <ForgotPasswordModal />}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ApprovalGateProvider>
            <AppInner />
          </ApprovalGateProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
