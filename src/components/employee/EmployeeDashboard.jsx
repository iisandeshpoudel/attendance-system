import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../hooks/useAttendance';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const { attendance, summary, loading, error, actions } = useAttendance();
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCheckIn = async () => {
    setActionLoading(true);
    setMessage('');
    
    const result = await actions.checkIn();
    
    if (result.success) {
      setMessage(result.message);
    } else {
      setMessage(result.error);
    }
    
    setActionLoading(false);
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setMessage('');
    
    const result = await actions.checkOut(checkoutNotes);
    
    if (result.success) {
      setMessage(result.message);
      setCheckoutNotes('');
    } else {
      setMessage(result.error);
    }
    
    setActionLoading(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Not recorded';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-3"></div>
            <span className="text-white">Loading attendance data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Employee Dashboard</h1>
              <p className="text-gray-300">Welcome back, {user?.name}!</p>
              <p className="text-primary-400 text-sm">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={logout}
              className="glass-button bg-red-500/20 hover:bg-red-500/30 border-red-500/30"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <div className={`glass p-4 rounded-lg ${
            message.includes('success') ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
          }`}>
            <p className={`text-sm ${
              message.includes('success') ? 'text-green-200' : 'text-red-200'
            }`}>
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="glass bg-red-500/20 border-red-500/30 p-4 rounded-lg">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Check In/Out Card */}
          <div className="glass-card">
            <h2 className="text-xl font-semibold text-white mb-4">Attendance</h2>
            
            <div className="space-y-4">
              {!summary.isCheckedIn ? (
                // Check In Button
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="glass-button w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Checking In...
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl mr-2">🕐</span>
                      Check In
                    </>
                  )}
                </button>
              ) : (
                // Check Out Section
                <div className="space-y-4">
                  <div className="glass p-4 rounded-lg">
                    <p className="text-green-400 font-medium flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Checked In at {formatTime(attendance?.checkIn)}
                    </p>
                  </div>

                  {!summary.isCheckedOut && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={checkoutNotes}
                          onChange={(e) => setCheckoutNotes(e.target.value)}
                          className="glass-input resize-none"
                          rows="3"
                          placeholder="What did you accomplish today?"
                          disabled={actionLoading}
                        />
                      </div>

                      <button
                        onClick={handleCheckOut}
                        disabled={actionLoading}
                        className="glass-button w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Checking Out...
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl mr-2">🕕</span>
                            Check Out
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {summary.isCheckedOut && (
                    <div className="glass p-4 rounded-lg">
                      <p className="text-blue-400 font-medium">
                        ✅ Checked Out at {formatTime(attendance?.checkOut)}
                      </p>
                      <p className="text-gray-300 text-sm mt-1">
                        Total Hours: {attendance?.totalHours || '0.00'}h
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Today's Summary */}
          <div className="glass-card">
            <h2 className="text-xl font-semibold text-white mb-4">Today's Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  summary.isCheckedOut ? 'bg-blue-500/20 text-blue-300' :
                  summary.isCheckedIn ? 'bg-green-500/20 text-green-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {summary.isCheckedOut ? 'Completed' :
                   summary.isCheckedIn ? 'Working' : 'Not Started'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Check In:</span>
                <span className="text-white">{formatTime(attendance?.checkIn)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Check Out:</span>
                <span className="text-white">{formatTime(attendance?.checkOut)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Working Time:</span>
                <span className="text-white">{formatDuration(summary.netWorkingMinutes)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Break Time:</span>
                <span className="text-white">{formatDuration(summary.totalBreakMinutes)}</span>
              </div>

              {attendance?.totalHours && (
                <div className="flex justify-between items-center pt-2 border-t border-white/20">
                  <span className="text-gray-300 font-medium">Total Hours:</span>
                  <span className="text-primary-400 font-bold">{attendance.totalHours}h</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {attendance?.notes && (
          <div className="glass-card">
            <h2 className="text-xl font-semibold text-white mb-4">Today's Notes</h2>
            <div className="glass p-4 rounded-lg">
              <p className="text-gray-300">{attendance.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard; 