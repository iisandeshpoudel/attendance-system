import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import EmployeeDashboard from './components/employee/EmployeeDashboard';

// Placeholder admin dashboard for now
const AdminDashboard = () => {
  const { logout, user } = useAuth();
  
  return (
    <div className="min-h-screen p-4">
      <div className="glass-card">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-gray-300">Welcome to the admin panel!</p>
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <p className="text-primary-400 text-sm capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="glass-button bg-red-500/20 hover:bg-red-500/30 border-red-500/30"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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