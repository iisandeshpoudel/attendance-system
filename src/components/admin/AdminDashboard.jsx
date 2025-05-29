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
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 backdrop-blur-layers">
      <div className="max-w-5xl lg:max-w-7xl mx-auto">
        {/* Premium Header */}
        <div className="glass-card mb-4 sm:mb-6 lg:mb-8 luxury-shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1 sm:mb-2 lg:mb-3 gradient-text">
                Admin Dashboard
              </h1>
              <p className="text-gray-300/90 text-sm sm:text-base lg:text-lg">
                Welcome back, <span className="text-purple-300 font-semibold">{user?.name}</span>! 
                <span className="hidden sm:inline"> Manage your team's attendance with elegance.</span>
              </p>
            </div>
            <div className="glass rounded-lg sm:rounded-xl lg:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 backdrop-blur-layers floating w-full sm:w-auto">
              <div className="text-xs sm:text-sm font-medium text-gray-300 mb-0.5 sm:mb-1">Total Employees</div>
              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold gradient-text">
                {loading ? (
                  <div className="loading-shimmer w-6 h-6 sm:w-8 sm:h-8 rounded"></div>
                ) : (
                  employees.length
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Navigation Tabs */}
        <div className="glass-card mb-4 sm:mb-6 lg:mb-8 luxury-shadow">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button flex-1 sm:flex-none ${
                  activeTab === tab.id ? 'tab-button-active' : 'tab-button-inactive'
                }`}
              >
                <span className="text-base sm:text-lg lg:text-xl mr-2 sm:mr-3">{tab.icon}</span>
                <span className="font-semibold text-sm sm:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
              {/* Premium Status Cards */}
              <div className="status-card-success">
                <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
                  <div className="p-2 sm:p-3 lg:p-4 bg-green-500/20 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-md floating">
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl">✅</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-0.5 sm:mb-1">
                      {employees.filter(emp => emp.status === 'active').length || 0}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-green-300">Active Today</div>
                  </div>
                </div>
              </div>

              <div className="status-card-warning">
                <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
                  <div className="p-2 sm:p-3 lg:p-4 bg-yellow-500/20 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-md floating">
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl">⏰</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-0.5 sm:mb-1">0</div>
                    <div className="text-xs sm:text-sm font-medium text-yellow-300">On Break</div>
                  </div>
                </div>
              </div>

              <div className="status-card-danger sm:col-span-2 lg:col-span-1">
                <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
                  <div className="p-2 sm:p-3 lg:p-4 bg-gray-500/20 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-md floating">
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl">📴</div>
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-0.5 sm:mb-1">
                      {employees.length}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-gray-300">Offline</div>
                  </div>
                </div>
              </div>

              {/* Premium Activity Section */}
              <div className="glass-card sm:col-span-2 lg:col-span-3 luxury-shadow">
                <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white mb-3 sm:mb-4 lg:mb-6 gradient-text">
                  Recent Activity
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {employees.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 lg:py-16">
                      <div className="text-4xl sm:text-6xl lg:text-8xl mb-3 sm:mb-4 lg:mb-6 floating">👥</div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 gradient-text">
                        No Employees Yet
                      </h3>
                      <p className="text-gray-300/80 mb-4 sm:mb-6 lg:mb-8 text-sm sm:text-base lg:text-lg max-w-md mx-auto px-4">
                        Start by adding employee accounts to see their activity and create 
                        a thriving digital workspace.
                      </p>
                      <button
                        onClick={() => setActiveTab('employees')}
                        className="glass-button bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg floating"
                      >
                        Add Employees →
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8 lg:py-12">
                      <div className="text-3xl sm:text-4xl lg:text-6xl mb-2 sm:mb-3 lg:mb-4 floating">🌙</div>
                      <div className="text-sm sm:text-base lg:text-xl text-gray-300/80">
                        No activity today. Employees will appear here when they check in.
                      </div>
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
            <div className="glass-card luxury-shadow">
              <div className="text-center py-10 sm:py-15 lg:py-20">
                <div className="text-4xl sm:text-6xl lg:text-8xl mb-4 sm:mb-6 lg:mb-8 floating">📊</div>
                <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 gradient-text">
                  Advanced Reports Coming Soon
                </h3>
                <p className="text-gray-300/80 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-4 sm:mb-6 lg:mb-8 px-4">
                  We're crafting beautiful analytics and comprehensive reporting features 
                  that will be available in Phase 4. Get ready for insights that matter.
                </p>
                <div className="glass px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl inline-block">
                  <span className="text-purple-300 font-semibold text-xs sm:text-sm lg:text-base">Phase 4 Feature</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 