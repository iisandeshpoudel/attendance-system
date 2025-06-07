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
        onEmployeeChange();
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
        onEmployeeChange();
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
          message.type === 'success' 
            ? 'border-emerald-400/50 bg-emerald-500/10' 
            : 'border-rose-400/50 bg-rose-500/10'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg emoji">
                {message.type === 'success' ? '✅' : '⚠️'}
              </span>
              <div className={`font-medium ${
                message.type === 'success' ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {message.text}
              </div>
            </div>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className={`${
                message.type === 'success' ? 'text-emerald-400 hover:text-emerald-300' : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-card">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold gradient-text mb-2">
              Employee Management
            </h2>
            <p className="text-purple-200/80">
              Create, view, and manage your team members with sophisticated control.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`glass-button font-medium px-6 py-3 floating ${
              showAddForm 
                ? 'glass-button-danger' 
                : 'glass-button-success'
            }`}
          >
            {showAddForm ? (
              <>
                <span className="emoji mr-2">✕</span>
                Cancel
              </>
            ) : (
              <>
                <span className="emoji mr-2">➕</span>
                Add Employee
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="glass-card floating">
          <div className="mb-6">
            <h3 className="text-xl font-bold gradient-text mb-2 flex items-center space-x-2">
              <span className="text-2xl emoji">👤</span>
              <span>Create New Employee Account</span>
            </h3>
            <p className="text-purple-200/80">
              Add a new team member to your attendance tracking system.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-purple-200 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input"
                  placeholder="Sandesh Poudel"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-purple-200 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input"
                  placeholder="sandesh@bichitras.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-purple-200 mb-2">
                Temporary Password
              </label>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
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
                  className="glass-button glass-button-warning floating whitespace-nowrap"
                >
                  <span className="emoji mr-2">🎲</span>
                  Generate
                </button>
              </div>
              <p className="text-sm text-purple-400 mt-2">
                Employee can change this password after first login
              </p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="glass-button glass-button-success font-medium px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed floating flex-1 sm:flex-none"
              >
                {loading ? (
                  <>
                    <span className="animate-spin emoji mr-2">⏳</span>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <span className="emoji mr-2">✨</span>
                    Create Employee
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="glass-button font-medium px-4 py-3 floating"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      <div className="glass-card">
        <div className="mb-6">
          <h3 className="text-xl font-bold gradient-text mb-2 flex items-center space-x-2">
            <span className="text-2xl emoji">👥</span>
            <span>Team Members</span>
            <span className="text-purple-400">({employees.length})</span>
          </h3>
          <p className="text-purple-200/80">
            Manage your current team members and their access.
          </p>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-12 border border-purple-400/20 bg-purple-500/5 rounded-lg">
            <span className="text-6xl mb-4 floating emoji block">👥</span>
            <h3 className="text-xl font-bold text-white mb-3 gradient-text">
              No Employees Added Yet
            </h3>
            <p className="text-purple-200/80 max-w-md mx-auto mb-6">
              Start building your team by adding employee accounts. 
              They'll be able to track their attendance once created.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="glass-button glass-button-success font-medium px-6 py-3 floating"
            >
              <span className="emoji mr-2">➕</span>
              Add First Employee
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="glass rounded-lg p-4 border border-purple-400/20 hover:border-purple-400/40 transition-all floating group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl emoji">👤</span>
                  </div>
                  <button
                    onClick={() => handleDelete(employee.id, employee.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-300"
                  >
                    <span className="emoji">🗑️</span>
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <h4 className="font-semibold text-white">{employee.name}</h4>
                    <p className="text-purple-300 text-sm">{employee.email}</p>
                  </div>
                  
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <span className="emoji">📅</span>
                      <span>Joined {new Date(employee.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement; 