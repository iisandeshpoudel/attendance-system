import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import AdminDashboard from './components/admin/AdminDashboard';

const AppContent = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-3"></div>
            <span className="text-white">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Route based on user role
  if (isAdmin) {
    return (
      <ProtectedRoute adminOnly>
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <EmployeeDashboard />
    </ProtectedRoute>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App; 