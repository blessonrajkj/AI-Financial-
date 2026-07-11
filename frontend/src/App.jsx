import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeAndRefreshProvider } from './context/ThemeAndRefreshContext';

// Import Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import ScannerPage from './pages/ScannerPage';
import BudgetsPage from './pages/BudgetsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ChatbotPage from './pages/ChatbotPage';
import SettingsPage from './pages/SettingsPage';
import SavingsPage from './pages/SavingsPage';
import InvestmentsPage from './pages/InvestmentsPage';
import ReportsPage from './pages/ReportsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ImportPage from './pages/ImportPage';
import UpiScannerPage from './pages/UpiScannerPage';

// Layout components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

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
    <div className="min-h-screen bg-background text-textPrimary">
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Content wrapper panel */}
      <div className="p-4 lg:ml-64 pt-24 min-h-screen transition-all">
        <main className="max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ThemeAndRefreshProvider>
      <AuthProvider>
        <BrowserRouter>
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
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/savings" element={<SavingsPage />} />
                <Route path="/investments" element={<InvestmentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/upi-scanner" element={<UpiScannerPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeAndRefreshProvider>
  );
};

export default App;