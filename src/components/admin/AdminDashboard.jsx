import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserManagement from './UserManagement';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'employees', label: 'Employee Management', icon: '👥' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-300">
                Welcome back, {user?.name}! Manage your team's attendance here.
              </p>
            </div>
            <div className="glass px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-300">Total Employees</div>
              <div className="text-2xl font-bold text-primary-400">
                {loading ? '...' : employees.length}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="glass-card mb-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="glass-card">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <div className="text-2xl">✅</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {employees.filter(emp => emp.status === 'active').length || 0}
                    </div>
                    <div className="text-sm text-gray-300">Active Today</div>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <div className="text-2xl">⏰</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">0</div>
                    <div className="text-sm text-gray-300">On Break</div>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <div className="text-2xl">📴</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {employees.length}
                    </div>
                    <div className="text-sm text-gray-300">Offline</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card md:col-span-2 lg:col-span-3">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {employees.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No Employees Yet
                      </h3>
                      <p className="text-gray-300 mb-4">
                        Start by adding employee accounts to see their activity here.
                      </p>
                      <button
                        onClick={() => setActiveTab('employees')}
                        className="glass-button text-primary-400 hover:text-white"
                      >
                        Add Employees →
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-300">
                      No activity today. Employees will appear here when they check in.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <UserManagement 
              employees={employees} 
              onEmployeeChange={fetchEmployees}
            />
          )}

          {activeTab === 'reports' && (
            <div className="glass-card">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Reports Coming Soon
                </h3>
                <p className="text-gray-300">
                  Advanced reporting and analytics will be available in Phase 4.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 