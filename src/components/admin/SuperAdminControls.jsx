import { useState, useEffect } from 'react';

const SuperAdminControls = ({ employees, onRefreshData }) => {
  const [activeSection, setActiveSection] = useState('bulk-operations');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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

  useEffect(() => {
    fetchSystemSettings();
    fetchAuditLogs();
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
        setMessage('✅ System settings updated successfully!');
        fetchSystemSettings(); // Refresh settings
      } else {
        setMessage('❌ Failed to update settings: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error updating settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceAction = async () => {
    if (!forceActionData.employee_id || !forceActionData.action) {
      setMessage('❌ Please select employee and action');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=force-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(forceActionData)
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Action forced successfully!');
        setForceActionData({ employee_id: '', action: '', notes: '' });
        onRefreshData();
      } else {
        setMessage('❌ Failed to force action: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error forcing action: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedEmployees.length === 0) {
      setMessage('❌ Please select attendance records to edit');
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
      setMessage('❌ Please provide at least one field to update');
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
      if (data.success) {
        setMessage(`✅ ${data.updated_count} records updated successfully!`);
        setSelectedEmployees([]);
        setBulkEditData({
          check_in: '',
          check_out: '',
          total_hours: '',
          notes: '',
          status: ''
        });
        fetchAttendanceRecords();
      } else {
        setMessage('❌ Failed to bulk edit: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Error in bulk edit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(filterData);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/super-controls?action=get-all-attendance&${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setAttendanceRecords(data.data.records);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
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
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
              <span>Super Admin Control Center</span>
            </h2>
            <p className="text-purple-200/80">
              Complete administrative control over the entire attendance system
            </p>
          </div>
          <div className="glass rounded-lg px-4 py-2">
            <div className="text-xs font-medium text-purple-300 mb-1">Access Level</div>
            <div className="text-lg font-bold text-yellow-400">MAXIMUM</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">👥</div>
            <div className="text-lg font-bold text-white">{employees.length}</div>
            <div className="text-xs text-purple-300">Total Employees</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">📊</div>
            <div className="text-lg font-bold text-white">{attendanceRecords.length}</div>
            <div className="text-xs text-purple-300">Records Loaded</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">⚡</div>
            <div className="text-lg font-bold text-white">{selectedEmployees.length}</div>
            <div className="text-xs text-purple-300">Selected for Bulk</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-2xl emoji">🔍</div>
            <div className="text-lg font-bold text-white">{auditLogs.length}</div>
            <div className="text-xs text-purple-300">Recent Actions</div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className="glass-card border-2 border-blue-400/30 bg-blue-500/10">
          <div className="flex items-center space-x-3">
            <span className="text-2xl emoji">ℹ️</span>
            <span className="text-blue-200 flex-1">{message}</span>
            <button 
              onClick={() => setMessage('')}
              className="text-blue-400 hover:text-blue-300 transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="glass-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span className="emoji">🎛️</span>
            <span>Control Sections</span>
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
                <div className="text-xs opacity-80">{section.description}</div>
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
            {/* What This Does - Clear Explanation */}
            <div className="glass-card border-2 border-emerald-400/30">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">💡</span>
                <span>What Bulk Operations Does</span>
              </h3>
              
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
                  <h4 className="text-emerald-300 font-semibold mb-3 flex items-center space-x-2">
                    <span className="emoji">🎯</span>
                    <span>Purpose & Real-World Examples</span>
                  </h4>
                  <div className="space-y-3 text-emerald-200/90 text-sm">
                    <div className="flex items-start space-x-3">
                      <span className="emoji">🔧</span>
                      <div>
                        <div className="font-medium">System Outage Recovery:</div>
                        <div className="opacity-90">When your internet/system was down, employees couldn't check in. Use this to set everyone's check-in time to 9:00 AM for that day.</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="emoji">📅</span>
                      <div>
                        <div className="font-medium">Special Event Hours:</div>
                        <div className="opacity-90">Company meeting ran late? Bulk edit everyone's check-out time to reflect the actual end time (e.g., 6:30 PM instead of 5:00 PM).</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="emoji">💰</span>
                      <div>
                        <div className="font-medium">Payroll Corrections:</div>
                        <div className="opacity-90">Need to adjust hours for payroll? Select records and update work hours to match approved timesheets.</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="emoji">📝</span>
                      <div>
                        <div className="font-medium">Status Updates:</div>
                        <div className="opacity-90">Mark multiple incomplete records as "completed" after manual verification of work done.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                  <h4 className="text-blue-300 font-semibold mb-3 flex items-center space-x-2">
                    <span className="emoji">📋</span>
                    <span>Step-by-Step Instructions</span>
                  </h4>
                  <ol className="text-blue-200/90 text-sm space-y-2">
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">1.</span>
                      <span>Go to "All Records" tab and use filters to find the records you want to edit (e.g., select date range, specific employee, or status)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">2.</span>
                      <span>Return to this "Bulk Operations" tab - the records will still be loaded</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">3.</span>
                      <span>Check the boxes next to records you want to edit (or use "Select All" checkbox)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">4.</span>
                      <span>Fill in ONLY the fields you want to change (leave others empty to keep existing values)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">5.</span>
                      <span>Click "Apply Bulk Changes" - all selected records will be updated instantly</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">6.</span>
                      <span>Check "Audit Trail" tab to see exactly what was changed and when</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Bulk Edit Interface */}
            <div className="glass-card">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">⚡</span>
                <span>Bulk Edit Controls</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Update Fields */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <span className="emoji">📝</span>
                    <span>Fields to Update</span>
                  </h4>
                  
                  <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
                    <div className="text-yellow-300 text-sm font-medium mb-1 flex items-center space-x-2">
                      <span className="emoji">⚠️</span>
                      <span>Smart Update Rules:</span>
                    </div>
                    <ul className="text-yellow-200/80 text-xs space-y-1">
                      <li>• Only fields you fill will be changed</li>
                      <li>• Empty fields keep their current values</li>
                      <li>• Changes apply to ALL selected records</li>
                      <li>• System auto-calculates work hours when times change</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
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
                    <span>Selected Records ({selectedEmployees.length})</span>
                  </h4>

                  {selectedEmployees.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
                        <div className="text-emerald-300 font-semibold mb-2 flex items-center space-x-2">
                          <span className="emoji">✅</span>
                          <span>Ready to Update {selectedEmployees.length} Records</span>
                        </div>
                        <div className="text-emerald-200/80 text-sm space-y-1">
                          <div>• Only filled fields above will be changed</div>
                          <div>• Empty fields will keep their current values</div>
                          <div>• All changes are immediately logged in audit trail</div>
                          <div>• You can undo by editing records individually later</div>
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
            {/* What This Does - Clear Explanation */}
            <div className="glass-card border-2 border-orange-400/30">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
                <span className="text-2xl emoji">🎯</span>
                <span>What Force Actions Do</span>
              </h3>
              
              <div className="space-y-4">
                <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4">
                  <h4 className="text-orange-300 font-semibold mb-3 flex items-center space-x-2">
                    <span className="emoji">🚨</span>
                    <span>Emergency Override System - Real Examples</span>
                  </h4>
                  <div className="space-y-3 text-orange-200/90 text-sm">
                    <div className="flex items-start space-x-3">
                      <span className="emoji">🚀</span>
                      <div>
                        <div className="font-medium">Force Check-in:</div>
                        <div className="opacity-90">John forgot to check in, already working. Force check-in at 9:00 AM so his work hours count for payroll.</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="emoji">🏁</span>
                      <div>
                        <div className="font-medium">Force Check-out:</div>
                        <div className="opacity-90">Sarah left sick but forgot to check out. Force check-out at 2:30 PM to finalize her half-day.</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="emoji">⏸️</span>
                      <div>
                        <div className="font-medium">Force End Breaks:</div>
                        <div className="opacity-90">Emergency client call needed but Mike is on lunch break and unreachable. End break to show he returned to help.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                  <h4 className="text-red-300 font-semibold mb-3 flex items-center space-x-2">
                    <span className="emoji">⚠️</span>
                    <span>Important: When Should You Use This?</span>
                  </h4>
                  <div className="space-y-2 text-red-200/90 text-sm">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-400">✅</span>
                      <span>Employee forgot to check in/out but actually worked</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-400">✅</span>
                      <span>System was down and employee couldn't access it</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-400">✅</span>
                      <span>Emergency situation requiring immediate attendance update</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-red-400">❌</span>
                      <span>Employee intentionally didn't check in (discuss with them first)</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-red-400">❌</span>
                      <span>Changing past attendance for unauthorized overtime</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                  <h4 className="text-blue-300 font-semibold mb-3 flex items-center space-x-2">
                    <span className="emoji">📋</span>
                    <span>How to Use Force Actions</span>
                  </h4>
                  <ol className="text-blue-200/90 text-sm space-y-2">
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">1.</span>
                      <span>Select the employee from the dropdown</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">2.</span>
                      <span>Choose the action (Check-in, Check-out, or End Breaks)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">3.</span>
                      <span>Write a detailed note explaining WHY you're doing this (required for legal compliance)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">4.</span>
                      <span>Click "Execute Force Action" - it happens immediately, no undo!</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="font-bold text-blue-400">5.</span>
                      <span>Employee will see "Admin Override" on their record and get notified</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

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
                        <span>Force Check-in</span>
                      </div>
                      <ul className="text-emerald-200/80 text-sm space-y-1">
                        <li>• Creates new attendance record for today</li>
                        <li>• Sets check-in time to current moment</li>
                        <li>• Employee status becomes "Working"</li>
                        <li>• Overwrites any existing check-in time</li>
                        <li>• Employee receives notification of forced action</li>
                      </ul>
                    </div>

                    <div className="bg-rose-500/10 border border-rose-400/30 rounded-lg p-4">
                      <div className="text-rose-300 font-semibold mb-2 flex items-center space-x-2">
                        <span className="emoji">🏁</span>
                        <span>Force Check-out</span>
                      </div>
                      <ul className="text-rose-200/80 text-sm space-y-1">
                        <li>• Sets check-out time to current moment</li>
                        <li>• Automatically calculates total work hours</li>
                        <li>• Employee status becomes "Completed"</li>
                        <li>• Ends any active breaks automatically</li>
                        <li>• Finalizes the day's attendance record</li>
                      </ul>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
                      <div className="text-amber-300 font-semibold mb-2 flex items-center space-x-2">
                        <span className="emoji">▶️</span>
                        <span>Force End Breaks</span>
                      </div>
                      <ul className="text-amber-200/80 text-sm space-y-1">
                        <li>• Ends all currently active breaks</li>
                        <li>• Calculates break durations automatically</li>
                        <li>• Employee status returns to "Working"</li>
                        <li>• Does not affect check-in/out times</li>
                        <li>• Useful for emergency work situations</li>
                      </ul>
                    </div>
                  </div>

                  {/* Important Warnings */}
                  <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                    <div className="text-red-300 font-semibold mb-3 flex items-center space-x-2">
                      <span className="emoji">⚠️</span>
                      <span>Important Warnings</span>
                    </div>
                    <ul className="text-red-200/80 text-sm space-y-2">
                      <li className="flex items-start space-x-2">
                        <span className="emoji">🔒</span>
                        <span>All forced actions are permanently logged and cannot be hidden</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="emoji">👤</span>
                        <span>Employees will see "Admin Override" in their attendance history</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="emoji">📊</span>
                        <span>Forced actions affect payroll calculations and reports</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="emoji">⏰</span>
                        <span>Actions cannot be undone - only corrected with new actions</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="emoji">📝</span>
                        <span>Detailed notes are required for compliance and transparency</span>
                      </li>
                    </ul>
                  </div>

                  {/* Best Practices */}
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                    <div className="text-blue-300 font-semibold mb-3 flex items-center space-x-2">
                      <span className="emoji">💡</span>
                      <span>Best Practices</span>
                    </div>
                    <ul className="text-blue-200/80 text-sm space-y-2">
                      <li>• Always communicate with the employee before forcing actions</li>
                      <li>• Use detailed, professional language in administrative notes</li>
                      <li>• Consider alternative solutions before using force actions</li>
                      <li>• Document the business reason for the override</li>
                      <li>• Review audit logs regularly for compliance</li>
                    </ul>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Work Hours Settings */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span className="emoji">🕒</span>
                    <span>Work Hours Policy</span>
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
                    <span>Settings History</span>
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
                <span>Advanced Filters</span>
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
                            {JSON.stringify(JSON.parse(log.new_values), null, 2)}
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