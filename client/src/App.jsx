import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    // Show glass loader while validating session token
    return (
      <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#060713] flex items-center justify-center">
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-indigo/30 border-t-brand-indigo animate-spin" />
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
            Authenticating...
          </span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Animated Page wrapper
const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
};

// Layout wrapper for authenticated pages
const AppLayout = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#060713] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Background radial gradient glow blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] ambient-glow-indigo rounded-full pointer-events-none opacity-40 z-0" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] ambient-glow-teal rounded-full pointer-events-none opacity-30 z-0" />

      <Sidebar isOpen={isMobileSidebarOpen} toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
      <Navbar toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
      
      {/* Main page content container */}
      <main className="lg:pl-64 pt-20 min-h-screen relative z-10">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto pb-24">
          {children}
        </div>
      </main>

      {/* Global Interactive Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};

// Interactive Toasts/Alert system overlay
const ToastContainer = () => {
  const { notifications, dismissNotification } = useBudget();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] space-y-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
          >
            <div className={`p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-start justify-between gap-3 text-xs font-bold ${
              notif.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
              notif.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' :
              notif.type === 'danger' ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' :
              'bg-slate-200/70 dark:bg-slate-900/70 border-slate-350/20 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              <span className="leading-relaxed">{notif.message}</span>
              <button 
                onClick={() => dismissNotification(notif.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded"
              >
                &times;
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// App Routes Orchestrator
const AppRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public auth screens */}
        <Route path="/login" element={
          <PageWrapper>
            <Login />
          </PageWrapper>
        } />
        
        <Route path="/register" element={
          <PageWrapper>
            <Register />
          </PageWrapper>
        } />

        {/* Protected Dashboard endpoints */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout>
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/transactions" element={
          <ProtectedRoute>
            <AppLayout>
              <PageWrapper>
                <Transactions />
              </PageWrapper>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/analytics" element={
          <ProtectedRoute>
            <AppLayout>
              <PageWrapper>
                <Analytics />
              </PageWrapper>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/budgets" element={
          <ProtectedRoute>
            <AppLayout>
              <PageWrapper>
                <Budgets />
              </PageWrapper>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/goals" element={
          <ProtectedRoute>
            <AppLayout>
              <PageWrapper>
                <Goals />
              </PageWrapper>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/logs" element={
          <ProtectedRoute>
            <AppLayout>
              <PageWrapper>
                <Logs />
              </PageWrapper>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <PageWrapper>
                <Settings />
              </PageWrapper>
            </AppLayout>
          </ProtectedRoute>
        } />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

// Main root component
const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BudgetProvider>
            <Router>
              <AppRoutes />
            </Router>
          </BudgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
