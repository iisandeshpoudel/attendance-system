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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Premium Message Display */}
      {message.text && (
        <div className={`glass-card border-l-4 luxury-shadow smooth-transition ${
          message.type === 'success' 
            ? 'border-green-400/50 bg-green-500/10' 
            : 'border-red-400/50 bg-red-500/10'
        }`}>
          <div className={`font-semibold text-sm sm:text-base lg:text-lg ${
            message.type === 'success' ? 'text-green-300' : 'text-red-300'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Premium Header */}
      <div className="glass-card luxury-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1 sm:mb-2 lg:mb-3 gradient-text">
              Employee Management
            </h2>
            <p className="text-gray-300/80 text-sm sm:text-base lg:text-lg">
              Create, view, and manage your team members <span className="hidden sm:inline">with sophisticated control</span>.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`glass-button font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg floating smooth-transition w-full sm:w-auto ${
              showAddForm 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300' 
                : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white'
            }`}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Employee'}
          </button>
        </div>
      </div>

      {/* Premium Add Employee Form */}
      {showAddForm && (
        <div className="glass-card luxury-shadow smooth-transition">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white mb-1 sm:mb-2 gradient-text">
              Create New Employee Account
            </h3>
            <p className="text-gray-300/70 text-sm sm:text-base">
              Add a new team member to your attendance tracking system.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className="form-group">
                <label className="form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input text-sm sm:text-base lg:text-lg"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input text-sm sm:text-base lg:text-lg"
                  placeholder="john@company.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Temporary Password
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input flex-1 text-sm sm:text-base lg:text-lg"
                  placeholder="Enter password (min 6 characters)"
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="glass-button whitespace-nowrap floating"
                >
                  🎲 Generate
                </button>
              </div>
              <p className="text-xs text-gray-400/80 mt-1 sm:mt-2">
                Employee can change this password after first login
              </p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-3 sm:pt-4 lg:pt-6">
              <button
                type="submit"
                disabled={loading}
                className="glass-button bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed floating"
              >
                {loading ? '⏳ Creating...' : '✓ Create Employee'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="glass-button text-gray-300 hover:text-white font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg floating"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Premium Employee List */}
      <div className="glass-card luxury-shadow">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white mb-1 sm:mb-2 gradient-text">
            Current Employees ({employees.length})
          </h3>
          <p className="text-gray-300/70 text-sm sm:text-base">
            Manage your team members and their access to the system.
          </p>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-10 sm:py-15 lg:py-20">
            <div className="text-4xl sm:text-6xl lg:text-8xl mb-4 sm:mb-6 lg:mb-8 floating">👥</div>
            <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 gradient-text">
              No Employees Added Yet
            </h4>
            <p className="text-gray-300/80 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 lg:mb-10 max-w-lg mx-auto px-4">
              Create employee accounts to get started with your premium attendance tracking experience.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="glass-button bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg floating"
            >
              + Add Your First Employee
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {employees.map((employee) => (
              <div key={employee.id} className="glass rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 hover:bg-white/[0.08] smooth-transition luxury-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6 w-full sm:w-auto">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500/30 to-purple-600/30 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center backdrop-blur-md avatar-ring floating">
                      <span className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-purple-200">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-white mb-0.5 sm:mb-1">
                        {employee.name}
                      </h4>
                      <p className="text-purple-300 font-medium mb-0.5 sm:mb-1 text-xs sm:text-sm lg:text-base">{employee.email}</p>
                      <p className="text-xs sm:text-sm text-gray-400/80">
                        Joined {new Date(employee.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto justify-end">
                    <div className="text-center">
                      <div className="status-offline mb-1 sm:mb-2"></div>
                      <span className="text-xs text-gray-400 font-medium">Offline</span>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(employee.id, employee.name)}
                      className="glass-button bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 floating text-xs sm:text-sm"
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

      {/* Premium Quick Actions */}
      {employees.length > 0 && (
        <div className="glass-card luxury-shadow">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-3 sm:mb-4 lg:mb-6 gradient-text">
            Quick Test Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <div className="glass rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-center hover:bg-white/[0.06] smooth-transition floating">
              <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 lg:mb-4">📧</div>
              <h4 className="font-bold text-white mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">Test Login</h4>
              <p className="text-xs sm:text-sm text-gray-300/80 mb-3 sm:mb-4 lg:mb-6">
                Try logging in as one of your employees to test the system
              </p>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/';
                }}
                className="glass-button text-purple-300 hover:text-white text-xs sm:text-sm font-semibold floating"
              >
                Go to Login Page
              </button>
            </div>
            
            <div className="glass rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-center opacity-75">
              <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 lg:mb-4">⏰</div>
              <h4 className="font-bold text-white mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">Check Attendance</h4>
              <p className="text-xs sm:text-sm text-gray-300/80 mb-3 sm:mb-4 lg:mb-6">
                View real-time employee check-in status
              </p>
              <span className="glass-button text-gray-400 text-xs sm:text-sm cursor-not-allowed">
                Phase 3 Feature
              </span>
            </div>
            
            <div className="glass rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-center opacity-75 sm:col-span-2 lg:col-span-1">
              <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 lg:mb-4">📊</div>
              <h4 className="font-bold text-white mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">Generate Reports</h4>
              <p className="text-xs sm:text-sm text-gray-300/80 mb-3 sm:mb-4 lg:mb-6">
                Export attendance data and analytics
              </p>
              <span className="glass-button text-gray-400 text-xs sm:text-sm cursor-not-allowed">
                Phase 4 Feature
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 