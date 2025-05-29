import React from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginForm from '../auth/LoginForm';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Show loading spinner while checking authentication
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Check admin access if required
  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card text-center">
          <div className="text-red-400 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-300 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-gray-400 text-sm">
            Admin access required.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute; 