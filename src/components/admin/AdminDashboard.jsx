import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserManagement from './UserManagement';
import SuperAdminControls from './SuperAdminControls';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  
  // Form states for editing
  const [editForm, setEditForm] = useState({
    checkIn: '',
    checkOut: '',
    totalHours: '',
    notes: '',
    status: 'active'
  });

  useEffect(() => {
    fetchEmployees();
    if (activeTab === 'overview') {
      fetchDashboardData();
      // Set up auto-refresh for real-time updates
      const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

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

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'working': return <span className="emoji">🟢</span>;
      case 'on_break': return <span className="emoji">⏸️</span>;
      case 'completed': return <span className="emoji">✅</span>;
      case 'not_started': return <span className="emoji">🔴</span>;
      default: return <span className="emoji">⚫</span>;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'working': return 'Working';
      case 'on_break': return 'On Break';
      case 'completed': return 'Completed';
      case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'working': return 'text-emerald-300';
      case 'on_break': return 'text-amber-300';
      case 'completed': return 'text-blue-300';
      case 'not_started': return 'text-rose-300';
      default: return 'text-gray-300';
    }
  };

  const getStatusCardClass = (status) => {
    switch (status) {
      case 'working': return 'border-emerald-400/30 bg-emerald-500/10';
      case 'on_break': return 'border-amber-400/30 bg-amber-500/10';
      case 'completed': return 'border-blue-400/30 bg-blue-500/10';
      case 'not_started': return 'border-rose-400/30 bg-rose-500/10';
      default: return 'border-gray-400/30 bg-gray-500/10';
    }
  };

  const getStatusIconBg = (status) => {
    switch (status) {
      case 'working': return 'bg-emerald-500/20';
      case 'on_break': return 'bg-amber-500/20';
      case 'completed': return 'bg-blue-500/20';
      case 'not_started': return 'bg-rose-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <span className="emoji">📊</span> },
    { id: 'employees', label: 'Employee Management', icon: <span className="emoji">👥</span> },
    { id: 'reports', label: 'Reports', icon: <span className="emoji">📈</span> },
    { id: 'super-admin', label: 'Super Admin', icon: <span className="emoji">🚀</span> },
  ];

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    
    // Use the attendanceId from the employee data (from dashboard API)
    if (employee.attendanceId || employee.checkIn) {
      setSelectedAttendance({ 
        id: employee.attendanceId || employee.id, // Use attendanceId if available
        userId: employee.id 
      });
      
      setEditForm({
        checkIn: employee.checkIn ? new Date(employee.checkIn).toISOString().slice(0, 16) : '',
        checkOut: employee.checkOut ? new Date(employee.checkOut).toISOString().slice(0, 16) : '',
        totalHours: employee.totalHours || '',
        notes: employee.notes || '',
        status: employee.attendanceStatus || employee.status || 'active'
      });
    } else {
      setSelectedAttendance(null);
      setEditForm({
        checkIn: '',
        checkOut: '',
        totalHours: '',
        notes: '',
        status: 'not_started'
      });
    }
    
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAttendance) {
      setError('No attendance record found for this employee today');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=edit-attendance`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceId: selectedAttendance.id,
          checkIn: editForm.checkIn || null,
          checkOut: editForm.checkOut || null,
          totalHours: editForm.totalHours ? parseFloat(editForm.totalHours) : null,
          notes: editForm.notes || null,
          status: editForm.status
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedEmployee(null);
        setSelectedAttendance(null);
        setEditForm({
          checkIn: '',
          checkOut: '',
          totalHours: '',
          notes: '',
          status: 'active'
        });
        setError('');
        await fetchDashboardData(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update attendance record');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Edit attendance error:', err);
    }
  };

  const handleResetAttendance = async (type) => {
    if (!selectedAttendance) {
      setError('No attendance record selected');
      return;
    }

    if (!confirm(`Are you sure you want to reset ${type} for ${selectedEmployee?.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=reset-employee`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          reset_type: type
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedEmployee(null);
        setSelectedAttendance(null);
        setError('');
        await fetchDashboardData(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to reset ${type}`);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Reset attendance error:', err);
    }
  };

  const handleCSVExport = async () => {
    try {
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      const employeeId = document.getElementById('employeeFilter').value;

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=export-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          startDate: startDate || null,
          endDate: endDate || null,
          employeeId: employeeId || null
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleJSONExport = async () => {
    try {
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      const employeeId = document.getElementById('employeeFilter').value;

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=export-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'json',
          startDate: startDate || null,
          endDate: endDate || null,
          employeeId: employeeId || null
        })
      });

      const data = await response.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Export failed:', data.error);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="glass-card">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-2">
                Admin Dashboard
              </h1>
              <p className="text-purple-200/80">
                Welcome back, <span className="text-purple-300 font-medium">{user?.name}</span>! 
                Manage your team with elegance.
              </p>
              {dashboardData && (
                <p className="text-xs text-purple-400 mt-1">
                  Last updated: {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="glass rounded-lg px-4 py-2 floating">
              <div className="text-xs font-medium text-purple-300 mb-1">Total Employees</div>
              <div className="text-2xl font-bold gradient-text">
                {loading ? (
                  <div className="animate-pulse bg-purple-500/20 w-8 h-6 rounded"></div>
                ) : (
                  dashboardData?.stats.totalEmployees || employees.length
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="glass-card">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button flex-1 sm:flex-none ${
                  activeTab === tab.id ? 'tab-button-active' : 'tab-button-inactive'
                }`}
              >
                <span className="text-lg mr-2">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Status Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="status-card-success floating">
                  <div className="status-content">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg icon-container">
                      <span className="text-xl emoji">🟢</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {dashboardData?.stats.checkedIn || 0}
                      </div>
                      <div className="text-xs font-medium text-emerald-300">Working</div>
                    </div>
                  </div>
                </div>

                <div className="status-card-warning floating">
                  <div className="status-content">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg icon-container">
                      <span className="text-xl emoji">⏸️</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {dashboardData?.stats.onBreak || 0}
                      </div>
                      <div className="text-xs font-medium text-amber-300">On Break</div>
                    </div>
                  </div>
                </div>

                <div className="status-card-info floating">
                  <div className="status-content">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg icon-container">
                      <span className="text-xl emoji">✅</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {dashboardData?.stats.checkedOut || 0}
                      </div>
                      <div className="text-xs font-medium text-blue-300">Completed</div>
                    </div>
                  </div>
                </div>

                <div className="status-card-danger floating">
                  <div className="status-content">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-lg icon-container">
                      <span className="text-xl emoji">🔴</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {dashboardData?.stats.notStarted || 0}
                      </div>
                      <div className="text-xs font-medium text-rose-300">Not Started</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Employee Status */}
              {dashboardData?.employees && dashboardData.employees.length > 0 && (
                <div className="glass-card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold gradient-text flex items-center space-x-2">
                      <span className="text-2xl emoji">👥</span>
                      <span>Live Employee Status</span>
                    </h3>
                    <div className="text-xs text-purple-400 px-3 py-1 bg-purple-500/10 rounded-lg border border-purple-400/20">
                      <span className="emoji mr-1">📝</span>
                      Click to edit
                    </div>
                  </div>
                  
                  {/* Error Display */}
                  {error && (
                    <div className="mb-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg emoji">⚠️</span>
                          <span className="text-rose-300 font-medium text-sm">{error}</span>
                        </div>
                        <button
                          onClick={() => setError('')}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardData.employees.map((employee) => (
                      <div 
                        key={employee.id} 
                        className={`glass rounded-lg p-4 hover:bg-purple-500/10 transition-all cursor-pointer border ${getStatusCardClass(employee.status)} group floating`}
                        onClick={() => openEditModal && openEditModal(employee)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusIconBg(employee.status)}`}>
                              <span className="text-lg">{getStatusIcon(employee.status)}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center space-x-2">
                                <span>{employee.name}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-purple-400 emoji">✏️</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {employee.checkIn ? `In: ${formatTime(employee.checkIn)}` : 'Not checked in'}
                                {employee.checkOut && ` | Out: ${formatTime(employee.checkOut)}`}
                                {employee.totalHours && ` | ${employee.totalHours}h`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-medium ${getStatusColor(employee.status)}`}>
                              {getStatusLabel(employee.status)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Work notes preview */}
                        {employee.notes && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="text-xs text-purple-400 mb-1 flex items-center space-x-1">
                              <span className="emoji">📝</span>
                              <span>Today's Work:</span>
                            </div>
                            <div className="text-xs text-gray-300 line-clamp-2">
                              {employee.notes.length > 80 ? `${employee.notes.substring(0, 80)}...` : employee.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="glass-card">
                <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                  <span className="text-2xl emoji">📋</span>
                  <span>Recent Activity</span>
                </h3>
                {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 glass rounded-lg border border-slate-400/20 bg-slate-500/5 hover:bg-slate-500/10 transition-all">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg">
                            {activity.action === 'checked_in' && <span className="emoji">🟢</span>}
                            {activity.action === 'checked_out' && <span className="emoji">🏁</span>}
                            {activity.action === 'started_break' && <span className="emoji">⏸️</span>}
                            {activity.action === 'ended_break' && <span className="emoji">▶️</span>}
                          </div>
                          <span className="text-white text-sm">{activity.message}</span>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-500/10 px-2 py-1 rounded">
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : employees.length === 0 ? (
                  <div className="empty-state">
                    <span className="text-6xl mb-4 floating emoji block">👥</span>
                    <h3 className="text-xl font-bold text-white mb-3 gradient-text">
                      No Employees Yet
                    </h3>
                    <p className="text-purple-200/80 mb-6 max-w-md mx-auto">
                      Start by adding employee accounts to see their activity.
                    </p>
                    <button
                      onClick={() => setActiveTab('employees')}
                      className="glass-button glass-button-success font-medium px-6 py-3 floating"
                    >
                      <span className="emoji mr-2">➕</span>
                      Add Employees
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-blue-400/20 bg-blue-500/5 rounded-lg">
                    <span className="text-4xl mb-3 floating emoji block">🌙</span>
                    <div className="text-blue-200/80">
                      No activity today. Employees will appear here when they check in.
                    </div>
                  </div>
                )}
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
            <div className="space-y-6">
              {/* Reports Content */}
              <div className="glass-card">
                <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                  <span className="text-2xl emoji">📊</span>
                  <span>Attendance Reports & Export</span>
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Export Controls */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                      <span className="emoji">📥</span>
                      <span>Export Data</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Start Date</label>
                        <input
                          type="date"
                          id="startDate"
                          className="glass-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">End Date</label>
                        <input
                          type="date"
                          id="endDate"
                          className="glass-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">Employee (Optional)</label>
                      <select
                        id="employeeFilter"
                        className="glass-input"
                      >
                        <option value="" className="bg-gray-800">All Employees</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id} className="bg-gray-800">
                            {emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCSVExport}
                        className="flex-1 glass-button glass-button-success font-medium px-4 py-3 floating"
                      >
                        <span className="emoji mr-2">📄</span>
                        Export CSV
                      </button>
                      <button
                        onClick={handleJSONExport}
                        className="flex-1 glass-button font-medium px-4 py-3 floating"
                      >
                        <span className="emoji mr-2">📋</span>
                        Export JSON
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                      <span className="emoji">📈</span>
                      <span>Quick Statistics</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">
                          {dashboardData?.stats.totalEmployees || employees.length}
                        </div>
                        <div className="text-xs text-emerald-300">Total Employees</div>
                      </div>
                      
                      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-400">
                          {dashboardData?.stats.checkedOut || 0}
                        </div>
                        <div className="text-xs text-blue-300">Completed Today</div>
                      </div>
                      
                      <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-purple-400">
                          {dashboardData?.stats.checkedIn || 0}
                        </div>
                        <div className="text-xs text-purple-300">Currently Working</div>
                      </div>
                      
                      <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-amber-400">
                          {dashboardData?.stats.onBreak || 0}
                        </div>
                        <div className="text-xs text-amber-300">On Break</div>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-4">
                      <div className="text-sm text-indigo-300 mb-2 flex items-center space-x-2">
                        <span className="emoji">📌</span>
                        <span>Export Features:</span>
                      </div>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Filter by date range and employee</li>
                        <li>• Includes work hours and break times</li>
                        <li>• CSV format for spreadsheet analysis</li>
                        <li>• JSON format for system integration</li>
                        <li>• Detailed work notes included</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Future Features Preview */}
              <div className="glass-card">
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 floating emoji block">📊</span>
                  <h3 className="text-xl font-bold text-white mb-3 gradient-text">
                    Advanced Analytics Coming Soon
                  </h3>
                  <p className="text-purple-200/80 max-w-lg mx-auto mb-4">
                    We're working on beautiful charts, productivity insights, and comprehensive reporting dashboards.
                  </p>
                  <div className="glass px-4 py-2 rounded-lg inline-block">
                    <span className="text-purple-300 font-medium text-sm">Phase 3+ Features</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'super-admin' && (
            <SuperAdminControls 
              employees={employees} 
              onRefreshData={fetchDashboardData}
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 