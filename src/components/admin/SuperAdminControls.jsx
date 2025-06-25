import { useState, useEffect, useRef } from 'react';
import { APP_CONFIG } from '../../utils/config';

const SuperAdminControls = ({ employees, onRefreshData }) => {
  const [activeSection, setActiveSection] = useState('bulk-operations');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Force action states
  const [forceActionData, setForceActionData] = useState({
    employee_id: '',
    action: '',
    notes: ''
  });

  // Bulk edit states
  const [bulkEditData, setBulkEditData] = useState({
    check_in: '',
    check_out: '',
    total_hours: '',
    notes: '',
    status: ''
  });

  // Advanced filter states
  const [filterData, setFilterData] = useState({
    start_date: '',
    end_date: '',
    employee_id: '',
    status: '',
    limit: 100
  });

  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const timeoutRefs = useRef(new Map()); // Track timeout IDs for cleanup

  useEffect(() => {
    fetchSystemSettings();
    fetchAuditLogs();
  }, []);

  // Notification state with cleanup tracking
  const showNotification = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    const newNotification = { id, message, type };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-dismiss after specified time (using config)
    const dismissTime = APP_CONFIG.NOTIFICATION_DISMISS_TIME[type.toUpperCase()] || APP_CONFIG.NOTIFICATION_DISMISS_TIME.INFO;
    const timeoutId = setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      timeoutRefs.current.delete(id);
    }, dismissTime);
    
    // Store timeout ID for cleanup
    timeoutRefs.current.set(id, timeoutId);
  };

  // Manual dismiss function
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    // Clear timeout if it exists
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
  };

  // Dismiss all notifications function
  const dismissAllNotifications = () => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
    // Clear all notifications
    setNotifications([]);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=get-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setSystemSettings(data.data.settings);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const updateSystemSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Convert settings object for API
      const settingsToUpdate = {};
      Object.keys(systemSettings).forEach(key => {
        settingsToUpdate[key] = systemSettings[key].value;
      });

      // Optimistically update local state
      setSystemSettings(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(settingsToUpdate).map(([key, value]) => [
          key, { ...prev[key], value }
        ]))
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=update-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: settingsToUpdate })
      });

      const data = await response.json();
      if (data.success) {
        showNotification('System settings updated successfully! Changes will appear on employee dashboards within 15 seconds.', 'success');
        fetchSystemSettings(); // Refresh settings from backend
        onRefreshData();
      } else {
        showNotification('Failed to update settings: ' + data.error, 'error');
      }
    } catch (error) {
      showNotification('Error updating settings: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForceAction = async () => {
    if (!forceActionData.employee_id || !forceActionData.action) {
      showNotification('Please select employee and action', 'warning');
      return;
    }

    if (!forceActionData.notes || forceActionData.notes.trim() === '') {
      showNotification('Administrative notes are required for force actions', 'warning');
      return;
    }

    // Check for existing attendance record if forcing check-in
    if (forceActionData.action === 'check_in') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/today`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: forceActionData.employee_id })
        });
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.check_out) {
          // Employee already completed their day
          const employeeName = employees.find(e => e.id == forceActionData.employee_id)?.name || 'Employee';
          const checkOutTime = new Date(data.data.check_out).toLocaleTimeString();
          const totalHours = data.data.total_hours || 0;
          
          const confirmMessage = `⚠️ WARNING: ${employeeName} already completed their day!\n\n` +
            `• Previous checkout: ${checkOutTime}\n` +
            `• Hours worked: ${totalHours}h\n\n` +
            `Force check-in will:\n` +
            `• Reset their checkout time (preserved in notes)\n` +
            `• Change status back to "Working"\n` +
            `• Reset work hours counter\n\n` +
            `Continue with force check-in?`;
          
          if (!confirm(confirmMessage)) {
            return; // User cancelled
          }
        }
      } catch (error) {
        console.error('Error checking existing attendance:', error);
        // Continue with force action if we can't check existing record
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      console.log('Force action data:', forceActionData);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=force-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(forceActionData)
      });

      console.log('Force action response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Force action error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Force action response data:', data);
      
      if (data.success) {
        showNotification(data.message, 'success');
        setForceActionData({ employee_id: '', action: '', notes: '' });
        onRefreshData();
        fetchAuditLogs(); // Refresh audit logs
      } else {
        showNotification('Failed to force action: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Force action error:', error);
      showNotification('Error forcing action: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedEmployees.length === 0) {
      showNotification('Please select attendance records to edit', 'warning');
      return;
    }

    // Filter out empty update fields
    const updates = {};
    Object.keys(bulkEditData).forEach(key => {
      if (bulkEditData[key] && bulkEditData[key].trim() !== '') {
        updates[key] = bulkEditData[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      showNotification('Please provide at least one field to update', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=bulk-edit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_ids: selectedEmployees,
          updates: updates
        })
      });

      const data = await response.json();
      console.log('Bulk edit response:', data);
      
      if (data.success) {
        showNotification(`${data.updated_count} records updated successfully!`, 'success');
        setSelectedEmployees([]);
        setBulkEditData({
          check_in: '',
          check_out: '',
          total_hours: '',
          notes: '',
          status: ''
        });
        // Delay the record refresh to not override success notification
        setTimeout(() => fetchAttendanceRecords(false), 1000);
      } else {
        const errorMsg = data.error || data.message || 'Unknown error occurred';
        showNotification(`Failed to bulk edit: ${errorMsg}`, 'error');
        console.error('Bulk edit failed:', data);
      }
    } catch (error) {
      console.error('Bulk edit error:', error);
      showNotification(`Error in bulk edit: ${error.message || 'Network or server error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async (showNotifications = true) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Clean and format filter data
      const cleanFilters = {};
      if (filterData.start_date) cleanFilters.start_date = filterData.start_date;
      if (filterData.end_date) cleanFilters.end_date = filterData.end_date;
      if (filterData.employee_id) cleanFilters.employee_id = filterData.employee_id;
      if (filterData.status) cleanFilters.status = filterData.status;
      if (filterData.limit) cleanFilters.limit = filterData.limit;
      
      const queryParams = new URLSearchParams(cleanFilters);
      
      console.log('Fetching with filters:', cleanFilters);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=get-all-attendance&${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setAttendanceRecords(data.data.records);
        if (showNotifications) {
          showNotification(`Found ${data.data.records.length} records`, 'success');
        }
      } else {
        const errorMsg = data.error || 'Unknown error occurred';
        if (showNotifications) {
          showNotification(`Error: ${errorMsg}`, 'error');
        }
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      if (showNotifications) {
        showNotification(`Error fetching records: ${error.message || 'Network error'}`, 'error');
      }
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=get-audit-logs&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const sections = [
    { id: 'bulk-operations', label: 'Bulk Operations', icon: '⚡', description: 'Edit multiple attendance records at once' },
    { id: 'force-actions', label: 'Force Actions', icon: '🎯', description: 'Override employee attendance states' },
    { id: 'system-settings', label: 'System Settings', icon: '⚙️', description: 'Configure work policies and system behavior' },
    { id: 'attendance-records', label: 'All Records', icon: '📋', description: 'View and manage all attendance data' },
    { id: 'audit-logs', label: 'Audit Trail', icon: '🔍', description: 'Track all administrative actions' }
  ];

  return (
    <div className="space-y-6">
      {/* Super Admin Header */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text mb-2 flex items-center space-x-3">
              <span className="text-3xl emoji">🚀</span>
              <span>Super Admin</span>
            </h2>
            <p className="text-purple-200/80">
              Complete administrative control over the entire attendance system
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Notification Counter */}
            {notifications.length > 0 && (
              <div className="glass rounded-lg px-3 py-2 bg-blue-500/20 border-blue-400/30">
                <div className="text-xs font-medium text-blue-300 mb-1">Active Alerts</div>
                <div className="text-lg font-bold text-blue-400">{notifications.length}</div>
              </div>
            )}
            
            <div className="glass rounded-lg px-4 py-2">
              <div className="text-xs font-medium text-purple-300 mb-1">Access</div>
              <div className="text-lg font-bold text-yellow-400">MAX</div>
            </div>

            {/* Test Notification Button (for demonstration) */}
            <button
              onClick={() => {
                showNotification('Test Success Message', 'success');
                setTimeout(() => showNotification('Test Error Message', 'error'), 500);
                setTimeout(() => showNotification('Test Warning Message', 'warning'), 1000);
                setTimeout(() => showNotification('Test Info Message', 'info'), 1500);
              }}
              className="glass-button text-xs px-3 py-1 rounded-lg hover:scale-105 transition-transform"
            >
              🧪 Test Queue
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">👥</div>
            <div className="text-lg font-bold text-white">{employees.length}</div>
            <div className="text-xs text-purple-300">Employees</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">📊</div>
            <div className="text-lg font-bold text-white">{attendanceRecords.length}</div>
            <div className="text-xs text-purple-300">Records</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">⚡</div>
            <div className="text-lg font-bold text-white">{selectedEmployees.length}</div>
            <div className="text-xs text-purple-300">Selected</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">🔍</div>
            <div className="text-lg font-bold text-white">{auditLogs.length}</div>
            <div className="text-xs text-purple-300">Actions</div>
          </div>
        </div>
      </div>

      {/* Floating Notification Queue */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
          {/* Dismiss All Button (when multiple notifications) */}
          {notifications.length > 1 && (
            <div className="flex justify-end mb-2">
              <button
                onClick={dismissAllNotifications}
                className="glass-button-warning text-xs px-3 py-1 rounded-lg hover:scale-105 transition-transform"
              >
                🗑️ Clear All ({notifications.length})
              </button>
            </div>
          )}

          {notifications.map((notification, index) => (
            <div 
              key={notification.id} 
              className="animate-slide-in"
              style={{ 
                animationDelay: `${index * 100}ms`,
                zIndex: 1000 - index 
              }}
            >
              <div className={`glass-card border-2 shadow-lg transform transition-all duration-300 hover:scale-105 ${
                notification.type === 'success' ? 'border-emerald-400/50 bg-emerald-500/10' :
                notification.type === 'error' ? 'border-rose-400/50 bg-rose-500/10' :
                notification.type === 'warning' ? 'border-amber-400/50 bg-amber-500/10' :
                'border-blue-400/50 bg-blue-500/10'
              }`}>
                <div className="flex items-start space-x-3 p-4">
                  <span className="text-xl emoji mt-0.5">
                    {notification.type === 'success' ? '✅' :
                     notification.type === 'error' ? '❌' :
                     notification.type === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <span className={`flex-1 font-medium ${
                    notification.type === 'success' ? 'text-emerald-200' :
                    notification.type === 'error' ? 'text-rose-200' :
                    notification.type === 'warning' ? 'text-amber-200' :
                    'text-blue-200'
                  }`}>
                    {notification.message}
                  </span>
                  <button 
                    onClick={() => dismissNotification(notification.id)}
                    className={`transition-colors text-lg hover:scale-110 ${
                      notification.type === 'success' ? 'text-emerald-400 hover:text-emerald-300' :
                      notification.type === 'error' ? 'text-rose-400 hover:text-rose-300' :
                      notification.type === 'warning' ? 'text-amber-400 hover:text-amber-300' :
                      'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="glass-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span className="emoji">🎛️</span>
            <span>Controls</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  activeSection === section.id 
                    ? 'bg-purple-500/20 border-purple-400/50 text-purple-200' 
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-2">{section.icon}</div>
                <div className="font-medium mb-1">{section.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="space-y-6">
        
        {/* Bulk Operations */}
        {activeSection === 'bulk-operations' && (
          <div className="space-y-6">

            {/* Bulk Edit Interface */}
            <div className="glass-card">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">⚡</span>
                <span>Bulk Edit</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Update Fields */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <span className="emoji">📝</span>
                    <span>Update Fields</span>
                  </h4>
                  
                  <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
                    <div className="text-yellow-300 text-sm font-medium mb-1 flex items-center space-x-2">
                      <span className="emoji">⚠️</span>
                      <span>Rules</span>
                    </div>
                    <ul className="text-yellow-200/80 text-xs space-y-1">
                      <li>• Filled fields update</li>
                      <li>• Empty fields unchanged</li>
                      <li>• Applies to selected</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>👤 Select Employee (Filter)</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">💡</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            <strong>Filter records by employee:</strong> Select an employee to show only their attendance records for bulk editing. Leave empty to show all employees.
                          </div>
                        </div>
                      </label>
                      <div className="flex space-x-2">
                        <select
                          value={filterData.employee_id}
                          onChange={(e) => setFilterData({...filterData, employee_id: e.target.value})}
                          className="glass-input flex-1"
                        >
                          <option value="">All Employees</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.email})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setFilterData({...filterData, employee_id: ''})}
                          className="glass-button px-3 py-2 text-xs hover:bg-red-500/20"
                          title="Clear employee filter"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>🕘 Check-in Time</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">💡</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            <strong>Example:</strong> Set to "2023-12-15 09:00" to make all selected employees appear as if they checked in at 9 AM on Dec 15th. Perfect for system outage recovery.
                          </div>
                        </div>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="datetime-local"
                          value={bulkEditData.check_in}
                          onChange={(e) => setBulkEditData({...bulkEditData, check_in: e.target.value})}
                          className="glass-input flex-1"
                          placeholder="Leave empty to keep current times"
                        />
                        <button
                          type="button"
                          onClick={() => setBulkEditData({...bulkEditData, check_in: ''})}
                          className="glass-button px-3 py-2 text-xs hover:bg-red-500/20"
                          title="Clear this field"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>🕕 Check-out Time</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">💡</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            <strong>Example:</strong> Set to "2023-12-15 18:30" for late company meeting. System will automatically recalculate total work hours.
                          </div>
                        </div>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="datetime-local"
                          value={bulkEditData.check_out}
                          onChange={(e) => setBulkEditData({...bulkEditData, check_out: e.target.value})}
                          className="glass-input flex-1"
                          placeholder="Leave empty to keep current times"
                        />
                        <button
                          type="button"
                          onClick={() => setBulkEditData({...bulkEditData, check_out: ''})}
                          className="glass-button px-3 py-2 text-xs hover:bg-red-500/20"
                          title="Clear this field"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>⏱️ Total Hours</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">💡</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            <strong>Example:</strong> Enter "8.5" to set everyone to 8.5 hours worked. Useful for approved overtime or special pay adjustments.
                          </div>
                        </div>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          value={bulkEditData.total_hours}
                          onChange={(e) => setBulkEditData({...bulkEditData, total_hours: e.target.value})}
                          className="glass-input flex-1"
                          placeholder="e.g., 8 or 8.5"
                        />
                        <button
                          type="button"
                          onClick={() => setBulkEditData({...bulkEditData, total_hours: ''})}
                          className="glass-button px-3 py-2 text-xs hover:bg-red-500/20"
                          title="Clear this field"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>📊 Status</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">💡</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            <strong>Example:</strong> Change multiple "not_started" records to "completed" after manual verification of work done.
                          </div>
                        </div>
                      </label>
                      <div className="flex space-x-2">
                        <select
                          value={bulkEditData.status}
                          onChange={(e) => setBulkEditData({...bulkEditData, status: e.target.value})}
                          className="glass-input flex-1"
                        >
                          <option value="">Keep current status</option>
                          <option value="working">🟢 Working</option>
                          <option value="on_break">⏸️ On Break</option>
                          <option value="completed">✅ Completed</option>
                          <option value="not_started">🔴 Not Started</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setBulkEditData({...bulkEditData, status: ''})}
                          className="glass-button px-3 py-2 text-xs hover:bg-red-500/20"
                          title="Clear this field"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>📝 Admin Notes</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">💡</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            <strong>Example:</strong> "Adjusted for company meeting" or "Corrected after system outage". This note will be added to all selected records.
                          </div>
                        </div>
                      </label>
                      <div className="flex space-x-2">
                        <textarea
                          value={bulkEditData.notes}
                          onChange={(e) => setBulkEditData({...bulkEditData, notes: e.target.value})}
                          className="glass-input flex-1"
                          rows="3"
                          placeholder="Optional: Add administrative note to all selected records"
                        />
                        <button
                          type="button"
                          onClick={() => setBulkEditData({...bulkEditData, notes: ''})}
                          className="glass-button px-3 py-2 text-xs hover:bg-red-500/20"
                          title="Clear this field"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Selection & Action */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <span className="emoji">🎯</span>
                    <span>Selected ({selectedEmployees.length})</span>
                  </h4>

                  {selectedEmployees.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
                        <div className="text-emerald-300 font-semibold mb-2 flex items-center space-x-2">
                          <span className="emoji">✅</span>
                          <span>Ready to Update {selectedEmployees.length} Records</span>
                        </div>
                        <div className="text-emerald-200/80 text-sm space-y-1">
                          <div>• Only filled fields will change</div>
                          <div>• Empty fields keep current values</div>
                          <div>• All changes are logged</div>
                        </div>
                      </div>

                      <button
                        onClick={handleBulkEdit}
                        disabled={loading}
                        className="glass-button glass-button-primary font-medium px-6 py-3 w-full floating text-lg"
                      >
                        {loading ? (
                          <>
                            <span className="emoji mr-2">⏳</span>
                            <span>Applying Changes...</span>
                          </>
                        ) : (
                          <>
                            <span className="emoji mr-2">⚡</span>
                            <span>Apply Bulk Changes to {selectedEmployees.length} Records</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedEmployees([]);
                          setBulkEditData({
                            check_in: '',
                            check_out: '',
                            total_hours: '',
                            notes: '',
                            status: ''
                          });
                        }}
                        className="glass-button font-medium px-6 py-2 w-full"
                      >
                        <span className="emoji mr-2">🔄</span>
                        <span>Clear Selection & Reset Fields</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="text-4xl mb-4 floating emoji block">📋</span>
                      <h4 className="text-lg font-bold text-white mb-3 gradient-text">
                        No Records Selected
                      </h4>
                      <p className="text-purple-200/80 mb-4 text-sm">
                        Go to "All Records" tab, use filters to find records, then come back here to select them for bulk editing.
                      </p>
                      <button
                        onClick={() => setActiveSection('attendance-records')}
                        className="glass-button glass-button-primary font-medium px-6 py-3 floating"
                      >
                        <span className="emoji mr-2">📋</span>
                        <span>Go to All Records</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Force Actions */}
        {activeSection === 'force-actions' && (
          <div className="space-y-6">
            
            {/* Force Action Interface */}
            <div className="glass-card">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">🎯</span>
                <span>Execute Force Action</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Force Action Controls */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="emoji">⚡</span>
                    <span>Execute Force Action</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Select Employee</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Choose the employee for whom you want to force an action. Only active employees are shown.
                          </div>
                        </div>
                      </label>
                      <select
                        value={forceActionData.employee_id}
                        onChange={(e) => setForceActionData({...forceActionData, employee_id: e.target.value})}
                        className="glass-input"
                      >
                        <option value="">Choose employee...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Force Action Type</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Select the action to force. Each action has different effects on the employee's current status.
                          </div>
                        </div>
                      </label>
                      <select
                        value={forceActionData.action}
                        onChange={(e) => setForceActionData({...forceActionData, action: e.target.value})}
                        className="glass-input"
                      >
                        <option value="">Choose action...</option>
                        <option value="check_in">🚀 Force Check-in - Start employee's work day</option>
                        <option value="check_out">🏁 Force Check-out - End employee's work day</option>
                        <option value="end_break">▶️ End All Breaks - Resume work immediately</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Administrative Notes</span>
                        <span className="text-xs text-rose-300">(Required for audit trail)</span>
                      </label>
                      <textarea
                        placeholder="Enter detailed reason for forcing this action (e.g., System outage recovery, Payroll correction, Emergency work assignment...)"
                        value={forceActionData.notes}
                        onChange={(e) => setForceActionData({...forceActionData, notes: e.target.value})}
                        className="glass-input"
                        rows="4"
                        required
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        This note will be visible to the employee and logged permanently in the audit trail.
                      </div>
                    </div>

                    {/* Action Preview */}
                    {forceActionData.employee_id && forceActionData.action && (
                      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                        <div className="text-blue-300 font-semibold mb-2 flex items-center space-x-2">
                          <span className="emoji">🔍</span>
                          <span>Action Preview</span>
                        </div>
                        <div className="text-blue-200/80 text-sm">
                          <strong>Employee:</strong> {employees.find(e => e.id == forceActionData.employee_id)?.name || 'Unknown'}<br/>
                          <strong>Action:</strong> {forceActionData.action.replace('_', ' ').toUpperCase()}<br/>
                          <strong>Time:</strong> {new Date().toLocaleString()}<br/>
                          <strong>Effect:</strong> {
                            forceActionData.action === 'check_in' ? 'Employee will be marked as working from now' :
                            forceActionData.action === 'check_out' ? 'Employee work day will end and hours calculated' :
                            'All active breaks will be ended and employee marked as working'
                          }
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleForceAction}
                      disabled={loading || !forceActionData.employee_id || !forceActionData.action || !forceActionData.notes}
                      className="glass-button glass-button-danger font-medium px-6 py-3 w-full floating"
                    >
                      {loading ? (
                        <>
                          <span className="emoji mr-2">⏳</span>
                          <span>Executing Action...</span>
                        </>
                      ) : (
                        <>
                          <span className="emoji mr-2">🎯</span>
                          <span>Execute Force Action</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Guidelines & Warnings */}
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="emoji">📋</span>
                    <span>Guidelines & Effects</span>
                  </h4>

                  {/* Action Details */}
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
                      <div className="text-emerald-300 font-semibold mb-2 flex items-center space-x-2">
                        <span className="emoji">🚀</span>
                        <span>Check-in</span>
                      </div>
                      <ul className="text-emerald-200/80 text-sm space-y-1">
                        <li>• New record</li>
                        <li>• Check-in time</li>
                        <li>• Working status</li>
                      </ul>
                    </div>

                    <div className="bg-rose-500/10 border border-rose-400/30 rounded-lg p-4">
                      <div className="text-rose-300 font-semibold mb-2 flex items-center space-x-2">
                        <span className="emoji">🏁</span>
                        <span>Check-out</span>
                      </div>
                      <ul className="text-rose-200/80 text-sm space-y-1">
                        <li>• Check-out time</li>
                        <li>• Hours</li>
                        <li>• Completed</li>
                      </ul>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
                      <div className="text-amber-300 font-semibold mb-2 flex items-center space-x-2">
                        <span className="emoji">▶️</span>
                        <span>End Breaks</span>
                      </div>
                      <ul className="text-amber-200/80 text-sm space-y-1">
                        <li>• End time</li>
                        <li>• Duration</li>
                        <li>• Working</li>
                      </ul>
                    </div>

                    <div className="bg-violet-500/10 border border-violet-400/30 rounded-lg p-4">
                      <div className="text-violet-300 font-semibold mb-2 flex items-center space-x-2">
                        <span className="emoji">📝</span>
                        <span>Status</span>
                      </div>
                      <ul className="text-violet-200/80 text-sm space-y-1">
                        <li>• Working</li>
                        <li>• Break</li>
                        <li>• Completed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Settings */}
        {activeSection === 'system-settings' && (
          <div className="space-y-6">
            <div className="glass-card">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">⚙️</span>
                <span>System Configuration</span>
              </h3>
              
              {/* Settings Description */}
              <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-4 mb-6">
                <div className="text-indigo-300 font-semibold mb-2 flex items-center space-x-2">
                  <span className="emoji">💡</span>
                  <span>System Settings Guide</span>
                </div>
                <p className="text-indigo-200/80 text-sm">
                  Configure global work policies and system behavior. These settings apply to all employees 
                  and control how the attendance system operates. Changes take effect immediately.
                </p>
              </div>

              {/* Configuration Mode Toggle - NEW SECTION */}
              <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-400/30 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl emoji">🎯</span>
                    <div>
                      <h4 className="text-lg font-semibold text-white">Configuration Mode</h4>
                      <p className="text-violet-200/80 text-sm">System rule enforcement</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${systemSettings.system_configuration_enabled?.value === 'false' ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {systemSettings.system_configuration_enabled?.value === 'false' ? '⏸️ FLEXIBLE MODE' : '✅ CONFIGURED MODE'}
                    </span>
                    <select
                      value={systemSettings.system_configuration_enabled?.value || 'true'}
                      onChange={(e) => {
                        setSystemSettings({
                          ...systemSettings,
                          system_configuration_enabled: { ...systemSettings.system_configuration_enabled, value: e.target.value }
                        });
                      }}
                      className="glass-input w-48 font-medium"
                    >
                      <option value="true">✅ Enforce Configuration</option>
                      <option value="false">⏸️ Flexible Mode (No Rules)</option>
                    </select>
                  </div>
                </div>

                {/* Mode Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Configured Mode */}
                  <div className={`p-4 rounded-lg border transition-all duration-300 ${
                    systemSettings.system_configuration_enabled?.value !== 'false' 
                      ? 'bg-emerald-500/10 border-emerald-400/30' 
                      : 'bg-gray-500/10 border-gray-500/20'
                  }`}>
                    <div className="text-emerald-300 font-semibold mb-2 flex items-center space-x-2">
                      <span className="emoji">✅</span>
                      <span>Configured Mode</span>
                    </div>
                    <ul className="text-emerald-200/80 text-sm space-y-1">
                      <li>• Work hours enforced</li>
                      <li>• Break limits apply</li>
                      <li>• Overtime active</li>
                      <li>• Weekend restrictions</li>
                    </ul>
                  </div>

                  {/* Flexible Mode */}
                  <div className={`p-4 rounded-lg border transition-all duration-300 ${
                    systemSettings.system_configuration_enabled?.value === 'false' 
                      ? 'bg-amber-500/10 border-amber-400/30' 
                      : 'bg-gray-500/10 border-gray-500/20'
                  }`}>
                    <div className="text-amber-300 font-semibold mb-2 flex items-center space-x-2">
                      <span className="emoji">⏸️</span>
                      <span>Flexible Mode (Holiday/Project Mode)</span>
                    </div>
                    <ul className="text-amber-200/80 text-sm space-y-1">
                      <li>• No work hour restrictions</li>
                      <li>• Unlimited break time</li>
                      <li>• Weekend work always allowed</li>
                      <li>• No auto-checkout</li>
                      <li>• No overtime warnings</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Work Hours Settings */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="emoji">🕒</span>
                    <span>Work Hours Policy</span>
                    {systemSettings.system_configuration_enabled?.value === 'false' && (
                      <span className="px-2 py-1 bg-amber-500/20 border border-amber-400/40 rounded text-xs text-amber-300">
                        Disabled in Flexible Mode
                      </span>
                    )}
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Work Start Time</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Default time when employees should start work. Used for calculating early/late arrivals.
                          </div>
                        </div>
                      </label>
                      <input
                        type="time"
                        value={systemSettings.work_start_time?.value || '09:00'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          work_start_time: { ...systemSettings.work_start_time, value: e.target.value }
                        })}
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Work End Time</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Standard end time for work day. Used for overtime calculations and auto-reminders.
                          </div>
                        </div>
                      </label>
                      <input
                        type="time"
                        value={systemSettings.work_end_time?.value || '17:00'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          work_end_time: { ...systemSettings.work_end_time, value: e.target.value }
                        })}
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Auto Check-out Time</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Time when system automatically checks out employees who forgot to check out manually.
                          </div>
                        </div>
                      </label>
                      <input
                        type="time"
                        value={systemSettings.auto_checkout_time?.value || '18:00'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          auto_checkout_time: { ...systemSettings.auto_checkout_time, value: e.target.value }
                        })}
                        className="glass-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Break & Overtime Settings */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="emoji">⏰</span>
                    <span>Break & Overtime Policy</span>
                    {systemSettings.system_configuration_enabled?.value === 'false' && (
                      <span className="px-2 py-1 bg-amber-500/20 border border-amber-400/40 rounded text-xs text-amber-300">
                        Disabled in Flexible Mode
                      </span>
                    )}
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Maximum Break Duration (minutes)</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Maximum allowed break time per day. System will warn employees when approaching limit.
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="180"
                        step="15"
                        value={systemSettings.break_duration_limit?.value || '60'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          break_duration_limit: { ...systemSettings.break_duration_limit, value: e.target.value }
                        })}
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Overtime Threshold (hours)</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Hours after which work time is considered overtime. Affects reporting and notifications.
                          </div>
                        </div>
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="12"
                        step="0.5"
                        value={systemSettings.overtime_threshold?.value || '8'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          overtime_threshold: { ...systemSettings.overtime_threshold, value: e.target.value }
                        })}
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Weekend Work Policy</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Allow employees to check in during weekends. Disable to restrict weekend work.
                          </div>
                        </div>
                      </label>
                      <select
                        value={systemSettings.weekend_work_allowed?.value || 'false'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          weekend_work_allowed: { ...systemSettings.weekend_work_allowed, value: e.target.value }
                        })}
                        className="glass-input"
                      >
                        <option value="true">Allowed</option>
                        <option value="false">Not Allowed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* System Behavior Settings */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="emoji">🔧</span>
                    <span>System Behavior</span>
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Auto-refresh Interval (seconds)</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            How often the admin dashboard refreshes automatically. Lower values show more real-time data.
                          </div>
                        </div>
                      </label>
                      <select
                        value={systemSettings.auto_refresh_interval?.value || '30'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          auto_refresh_interval: { ...systemSettings.auto_refresh_interval, value: e.target.value }
                        })}
                        className="glass-input"
                      >
                        <option value="15">15 seconds (High CPU)</option>
                        <option value="30">30 seconds (Recommended)</option>
                        <option value="60">60 seconds (Low CPU)</option>
                        <option value="120">2 minutes (Minimal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2 flex items-center space-x-2">
                        <span>Break Reminders</span>
                        <div className="group relative">
                          <span className="emoji cursor-help">ℹ️</span>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg border border-gray-600">
                            Enable automatic reminders for employees to take breaks after working continuously.
                          </div>
                        </div>
                      </label>
                      <select
                        value={systemSettings.break_reminders_enabled?.value || 'true'}
                        onChange={(e) => setSystemSettings({
                          ...systemSettings,
                          break_reminders_enabled: { ...systemSettings.break_reminders_enabled, value: e.target.value }
                        })}
                        className="glass-input"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Settings History */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="emoji">📜</span>
                    <span>History</span>
                  </h4>
                  
                  <div className="bg-slate-800/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {Object.entries(systemSettings).slice(0, 3).map(([key, setting]) => (
                      <div key={key} className="mb-3 last:mb-0">
                        <div className="text-sm font-medium text-white">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center justify-between">
                          <span>Current: {setting.value}</span>
                          {setting.updated_at && (
                            <span>Updated: {formatDateTime(setting.updated_at)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-purple-400/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="emoji">⚠️</span>
                    <span className="text-amber-300 text-sm">
                      Changes apply immediately to all employees
                    </span>
                  </div>
                  <button
                    onClick={updateSystemSettings}
                    disabled={loading}
                    className="glass-button glass-button-success font-medium px-8 py-3 floating"
                  >
                    {loading ? (
                      <>
                        <span className="emoji mr-2">⏳</span>
                        <span>Updating System...</span>
                      </>
                    ) : (
                      <>
                        <span className="emoji mr-2">💾</span>
                        <span>Save All Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Records */}
        {activeSection === 'attendance-records' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="glass-card">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">🔍</span>
                <span>Filters</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filterData.start_date}
                    onChange={(e) => setFilterData({...filterData, start_date: e.target.value})}
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filterData.end_date}
                    onChange={(e) => setFilterData({...filterData, end_date: e.target.value})}
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Employee</label>
                  <select
                    value={filterData.employee_id}
                    onChange={(e) => setFilterData({...filterData, employee_id: e.target.value})}
                    className="glass-input"
                  >
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Status</label>
                  <select
                    value={filterData.status}
                    onChange={(e) => setFilterData({...filterData, status: e.target.value})}
                    className="glass-input"
                  >
                    <option value="">All Statuses</option>
                    <option value="working">Working</option>
                    <option value="on_break">On Break</option>
                    <option value="completed">Completed</option>
                    <option value="active">Active</option>
                    <option value="not_started">Not Started</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Limit</label>
                  <select
                    value={filterData.limit}
                    onChange={(e) => setFilterData({...filterData, limit: e.target.value})}
                    className="glass-input"
                  >
                    <option value="50">50 records</option>
                    <option value="100">100 records</option>
                    <option value="250">250 records</option>
                    <option value="500">500 records</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={fetchAttendanceRecords}
                  className="glass-button glass-button-primary font-medium px-6 py-3 floating"
                >
                  <span className="emoji mr-2">🔍</span>
                  Apply Filters & Search
                </button>
              </div>
            </div>

            {/* Records Display */}
            <div className="glass-card">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">📋</span>
                <span>Attendance Records ({attendanceRecords.length})</span>
              </h3>

              {attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-purple-400/20">
                        <th className="text-left p-3 text-purple-200 font-medium">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployees(attendanceRecords.map(r => r.id));
                              } else {
                                setSelectedEmployees([]);
                              }
                            }}
                            className="rounded border-purple-400/50 text-purple-500 focus:ring-purple-500/50"
                          />
                        </th>
                        <th className="text-left p-3 text-purple-200 font-medium">Employee</th>
                        <th className="text-left p-3 text-purple-200 font-medium">Date</th>
                        <th className="text-left p-3 text-purple-200 font-medium">Check In</th>
                        <th className="text-left p-3 text-purple-200 font-medium">Check Out</th>
                        <th className="text-left p-3 text-purple-200 font-medium">Hours</th>
                        <th className="text-left p-3 text-purple-200 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => (
                        <tr key={record.id} className="border-b border-slate-600/30 hover:bg-purple-500/5 transition-colors">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(record.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployees([...selectedEmployees, record.id]);
                                } else {
                                  setSelectedEmployees(selectedEmployees.filter(id => id !== record.id));
                                }
                              }}
                              className="rounded border-purple-400/50 text-purple-500 focus:ring-purple-500/50"
                            />
                          </td>
                          <td className="p-3 text-white font-medium">{record.employee_name}</td>
                          <td className="p-3 text-gray-300">{record.date}</td>
                          <td className="p-3 text-gray-300">{formatDateTime(record.check_in)}</td>
                          <td className="p-3 text-gray-300">{formatDateTime(record.check_out)}</td>
                          <td className="p-3 text-gray-300">{record.total_hours || 'N/A'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              record.status === 'working' ? 'bg-emerald-500/20 text-emerald-300' :
                              record.status === 'on_break' ? 'bg-amber-500/20 text-amber-300' :
                              record.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-rose-500/20 text-rose-300'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 floating emoji block">📋</span>
                  <h3 className="text-xl font-bold text-white mb-3 gradient-text">
                    No Records Found
                  </h3>
                  <p className="text-purple-200/80 mb-4 text-sm">
                    Apply filters and search to view attendance records.
                  </p>
                  <button
                    onClick={fetchAttendanceRecords}
                    className="glass-button glass-button-primary font-medium px-6 py-3 floating"
                  >
                    <span className="emoji mr-2">🔍</span>
                    Load All Recent Records
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs */}
        {activeSection === 'audit-logs' && (
          <div className="glass-card">
            <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
              <span className="text-2xl emoji">🔍</span>
              <span>Admin Activity Audit Trail</span>
            </h3>

            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="glass rounded-lg p-4 border border-slate-400/20 bg-slate-500/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-lg emoji">
                            {log.action.includes('update') ? '✏️' :
                             log.action.includes('delete') ? '🗑️' :
                             log.action.includes('create') ? '➕' :
                             log.action.includes('force') ? '🎯' : '📋'}
                          </span>
                          <span className="font-semibold text-white">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                            {log.table_name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">
                          <span className="font-medium text-purple-300">{log.admin_name}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                        {log.new_values && (
                          <div className="text-xs text-gray-400 bg-slate-800/50 rounded p-2 font-mono">
                            {typeof log.new_values === 'string' 
                              ? JSON.stringify(JSON.parse(log.new_values), null, 2)
                              : JSON.stringify(log.new_values, null, 2)
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 floating emoji block">📋</span>
                <h3 className="text-xl font-bold text-white mb-3 gradient-text">
                  No Audit Logs Yet
                </h3>
                <p className="text-purple-200/80">
                  Admin actions will appear here for complete transparency.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminControls; 