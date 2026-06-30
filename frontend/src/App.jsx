import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TenantDashboard from './pages/TenantDashboard';
import TenantManagement from './pages/TenantManagement';
import AgentManagement from './pages/AgentManagement';
import SalesManagement from './pages/SalesManagement';
import PendingReviewsPage from './pages/PendingReviewsPage';
import NotFound from './pages/NotFound';
import { Loader2 } from 'lucide-react';

function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center bg-mesh">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <div className="text-slate-400 text-sm font-medium tracking-wide">
          Syncing secure workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute requiredRole="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/tenants"
            element={
              <PrivateRoute requiredRole="admin">
                <TenantManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <PrivateRoute>
                <AgentManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <PrivateRoute>
                <SalesManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <TenantDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/pending-reviews"
            element={
              <PrivateRoute>
                <PendingReviewsPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
