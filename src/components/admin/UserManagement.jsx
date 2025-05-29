import { useState } from 'react';

const UserManagement = ({ employees, onEmployeeChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Employee account created successfully!' });
        setFormData({ email: '', name: '', password: '' });
        setShowAddForm(false);
        onEmployeeChange(); // Refresh the employee list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create employee account' });
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}'s account? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Employee account deleted successfully!' });
        onEmployeeChange(); // Refresh the employee list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete employee account' });
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message.text && (
        <div className={`glass-card border-l-4 ${
          message.type === 'success' ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className={`font-medium ${
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Employee Management
            </h2>
            <p className="text-gray-300">
              Add, view, and manage employee accounts
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="glass-button bg-primary-500 hover:bg-primary-600 text-white"
          >
            {showAddForm ? '✕ Cancel' : '+ Add Employee'}
          </button>
        </div>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="glass-card">
          <h3 className="text-xl font-semibold text-white mb-6">
            Create New Employee Account
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input"
                  placeholder="john@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Temporary Password
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input flex-1"
                  placeholder="Enter password (min 6 characters)"
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="glass-button whitespace-nowrap"
                >
                  🎲 Generate
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Employee can change this password after first login
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="glass-button bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Creating...' : '✓ Create Employee'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="glass-button text-gray-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-6">
          Current Employees ({employees.length})
        </h3>

        {employees.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h4 className="text-lg font-semibold text-white mb-2">
              No Employees Added Yet
            </h4>
            <p className="text-gray-300 mb-6">
              Create employee accounts to get started with attendance tracking.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="glass-button bg-primary-500 hover:bg-primary-600 text-white"
            >
              + Add Your First Employee
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="glass p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                      <span className="text-xl font-semibold text-primary-400">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {employee.name}
                      </h4>
                      <p className="text-gray-300">{employee.email}</p>
                      <p className="text-sm text-gray-400">
                        Joined {new Date(employee.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mb-1"></div>
                      <span className="text-xs text-gray-400">Offline</span>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(employee.id, employee.name)}
                      className="glass-button bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300"
                      title="Delete Employee"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {employees.length > 0 && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">
            Quick Test Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">📧</div>
              <h4 className="font-semibold text-white mb-1">Test Login</h4>
              <p className="text-sm text-gray-300 mb-3">
                Try logging in as one of your employees
              </p>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/';
                }}
                className="glass-button text-primary-400 hover:text-white text-sm"
              >
                Go to Login Page
              </button>
            </div>
            
            <div className="glass p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">⏰</div>
              <h4 className="font-semibold text-white mb-1">Check Attendance</h4>
              <p className="text-sm text-gray-300 mb-3">
                View employee check-in status
              </p>
              <span className="glass-button text-gray-400 text-sm cursor-not-allowed">
                Coming Soon
              </span>
            </div>
            
            <div className="glass p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-semibold text-white mb-1">Generate Reports</h4>
              <p className="text-sm text-gray-300 mb-3">
                Export attendance data
              </p>
              <span className="glass-button text-gray-400 text-sm cursor-not-allowed">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 