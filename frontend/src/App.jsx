import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeAndRefreshProvider } from './context/ThemeAndRefreshContext';

// Lazy-loaded Pages for bundle optimization and faster initial load
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const ScannerPage = lazy(() => import('./pages/ScannerPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ChatbotPage = lazy(() => import('./pages/ChatbotPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SavingsPage = lazy(() => import('./pages/SavingsPage'));
const InvestmentsPage = lazy(() => import('./pages/InvestmentsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const UpiScannerPage = lazy(() => import('./pages/UpiScannerPage'));
const AIInsightsPage = lazy(() => import('./pages/AIInsightsPage'));

// Layout components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';

const LoadingSpinner = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Route guards
const ProtectedRoute = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary overflow-x-hidden">
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Content wrapper — offset by 260px sidebar width on desktop & navbar height */}
      <div className="lg:ml-[260px] pt-16 lg:pt-[72px] pb-24 lg:pb-6 min-h-screen transition-all duration-300">
        <main className="w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-6 animate-page-enter">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

const App = () => {
  return (
    <ThemeAndRefreshProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/scanner" element={<ScannerPage />} />
                  <Route path="/budgets" element={<BudgetsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/chat" element={<ChatbotPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                  <Route path="/settings/account" element={<SettingsPage />} />
                  <Route path="/savings" element={<SavingsPage />} />
                  <Route path="/investments" element={<InvestmentsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/subscriptions" element={<SubscriptionsPage />} />
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/upi-scanner" element={<UpiScannerPage />} />
                  <Route path="/ai-insights" element={<AIInsightsPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeAndRefreshProvider>
  );
};

export default App;
