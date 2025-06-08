import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../hooks/useAttendance';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const { 
    attendance, 
    breaks, 
    summary,
    loading, 
    error,
    checkIn, 
    checkOut, 
    startBreak, 
    endBreak, 
    refresh
  } = useAttendance();

  const [notes, setNotes] = useState('');
  const [breakNote, setBreakNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkoutError, setCheckoutError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemMode, setSystemMode] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (attendance?.notes) {
      setNotes(attendance.notes);
    }
  }, [attendance]);

  useEffect(() => {
    fetchSystemMode();
  }, []);

  const fetchSystemMode = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/system-mode`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setSystemMode(data.data.mode);
      }
    } catch (error) {
      console.error('Error fetching system mode:', error);
      setSystemMode('configured'); // Default to configured mode
    }
  };

  const handleCheckIn = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCheckoutError('');
    
    try {
      const result = await checkIn();
      if (!result.success) {
        setCheckoutError(result.error);
      }
    } catch (error) {
      setCheckoutError('Network error occurred');
    }
    setIsProcessing(false);
  };

  const handleCheckOut = async () => {
    if (isProcessing) return;
    
    if (!notes || notes.trim().length === 0) {
      setCheckoutError('Work log is required before checkout.');
      return;
    }
    
    if (notes.trim().length < 50) {
      setCheckoutError('Work log must be at least 50 characters long.');
      return;
    }
    
    setIsProcessing(true);
    setCheckoutError('');
    
    try {
      const result = await checkOut(notes);
      if (!result.success) {
        setCheckoutError(result.error);
      }
    } catch (error) {
      setCheckoutError('Network error occurred');
    }
    setIsProcessing(false);
  };

  const handleStartBreak = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const result = await startBreak(breakNote);
      if (!result.success) {
        setCheckoutError(result.error);
      }
      setBreakNote('');
    } catch (error) {
      setCheckoutError('Network error occurred');
    }
    setIsProcessing(false);
  };

  const handleEndBreak = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const result = await endBreak();
      if (!result.success) {
        setCheckoutError(result.error);
      }
    } catch (error) {
      setCheckoutError('Network error occurred');
    }
    setIsProcessing(false);
  };

  const isCheckedIn = summary?.isCheckedIn || (attendance?.check_in && !attendance?.check_out);
  const isOnBreak = summary?.onBreak || false;
  const hasCheckedOut = summary?.isCheckedOut || !!attendance?.check_out;

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getWorkingTime = () => {
    if (!attendance?.check_in) return 0;
    const checkInTime = new Date(attendance.check_in);
    const currentOrCheckOut = attendance?.check_out ? new Date(attendance.check_out) : currentTime;
    return Math.floor((currentOrCheckOut - checkInTime) / (1000 * 60));
  };

  const getTotalBreakTime = () => {
    return summary?.totalBreakMinutes || 0;
  };

  const getNetWorkingTime = () => {
    return summary?.netWorkingMinutes || Math.max(0, getWorkingTime() - getTotalBreakTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card">
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
            <span className="text-white text-lg gradient-text">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Employee Dashboard</h1>
          <p className="text-blue-200">Welcome back, {user?.name}</p>
          
          {/* System Mode Indicator */}
          {systemMode && (
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mt-3 ${
              systemMode === 'flexible' 
                ? 'bg-amber-500/10 border border-amber-400/30 text-amber-300' 
                : 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-300'
            }`}>
              <span className="emoji">
                {systemMode === 'flexible' ? '⏸️' : '✅'}
              </span>
              <span>
                {systemMode === 'flexible' 
                  ? 'Flexible Mode - Work anytime, no restrictions!' 
                  : 'Configured Mode - Standard work policies apply'
                }
              </span>
            </div>
          )}
        </div>

        {/* Checkout Error Display */}
        {checkoutError && (
          <div className="mb-6">
            <div className="glass-card border-l-4 border-red-400 bg-red-500/10">
              <div className="flex items-center space-x-2">
                <span className="emoji text-xl">❌</span>
                <div>
                  <p className="text-red-300 font-medium">Action Required</p>
                  <p className="text-red-200 text-sm">{checkoutError}</p>
                  {checkoutError.includes('Flexible Mode') && (
                    <p className="text-red-200/70 text-xs mt-1">
                      💡 Your admin can temporarily disable work restrictions for special projects or holidays.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Check-in Status */}
          <div className={`${isCheckedIn ? 'status-card-success' : 'status-card-danger'} floating`}>
            <div className="status-content">
              <div className={`w-10 h-10 rounded-lg icon-container ${
                isCheckedIn ? 'bg-emerald-500/20' : 'bg-rose-500/20'
              }`}>
                <span className="text-xl emoji">{isCheckedIn ? '🟢' : '🔴'}</span>
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                </div>
                <div className={`text-sm ${
                  isCheckedIn ? 'text-emerald-300' : 'text-gray-300'
                }`}>
                  {attendance?.check_in ? `Since ${formatTime(attendance.check_in)}` : 'Ready to start'}
                </div>
              </div>
            </div>
          </div>

          {/* Break Status */}
          <div className={`${isOnBreak ? 'status-card-warning' : 'status-card'} floating`}>
            <div className="status-content">
              <div className={`w-10 h-10 rounded-lg icon-container ${
                isOnBreak ? 'bg-amber-500/20' : 'bg-purple-500/20'
              }`}>
                <span className="text-xl emoji">{isOnBreak ? '⏸️' : '▶️'}</span>
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {isOnBreak ? 'On Break' : 'Working'}
                </div>
                <div className={`text-sm ${
                  isOnBreak ? 'text-amber-300' : 'text-purple-300'
                }`}>
                  {isOnBreak ? 'Break in progress' : `${getTotalBreakTime()}min total breaks`}
                </div>
              </div>
            </div>
          </div>

          {/* Working Time */}
          <div className="status-card-info floating">
            <div className="status-content">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg icon-container">
                <span className="text-xl emoji">⌚</span>
              </div>
              <div>
                <div className="text-lg font-bold gradient-text">
                  {formatDuration(getNetWorkingTime())}
                </div>
                <div className="text-sm text-blue-300">
                  Net Working Time
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Action Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Time Tracking Card */}
          <div className="glass-card">
            <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
              <span className="text-2xl emoji">⏱️</span>
              <span>Time Tracking</span>
            </h3>
            
            <div className="space-y-4">
              {!isCheckedIn && !hasCheckedOut ? (
                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="w-full glass-button glass-button-success py-4 text-lg disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin emoji mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="emoji mr-2">🚀</span>
                      Check In
                    </>
                  )}
                </button>
              ) : isCheckedIn ? (
                <button
                  onClick={handleCheckOut}
                  disabled={isProcessing || !notes.trim() || notes.trim().length < 50}
                  className="w-full glass-button glass-button-danger py-4 text-lg disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin emoji mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="emoji mr-2">🏁</span>
                      Check Out
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center py-6 glass rounded-lg border border-emerald-400/30 bg-emerald-500/10">
                  <span className="text-xl emoji mb-3 block">✅</span>
                  <div className="text-emerald-300 font-medium">
                    Already checked out today
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Total: {attendance?.total_hours || 0} hours
                  </div>
                </div>
              )}
              
              {/* Today's Schedule */}
              {isCheckedIn && attendance && (
                <div className="glass rounded-lg border border-blue-400/20 bg-blue-500/5 p-4">
                  <div className="text-blue-300 mb-3 font-medium flex items-center space-x-2">
                    <span className="emoji">📊</span>
                    <span>Today's Schedule</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Check-in:</span>
                      <span className="text-white font-medium">{formatTime(attendance.check_in)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Working:</span>
                      <span className="text-purple-300 font-bold">{formatDuration(getWorkingTime())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Breaks:</span>
                      <span className="text-amber-300">{formatDuration(getTotalBreakTime())}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-400/20 pt-2">
                      <span className="text-gray-300">Net Time:</span>
                      <span className="text-emerald-400 font-bold">{formatDuration(getNetWorkingTime())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Break Management Card */}
          <div className="glass-card">
            <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
              <span className="text-2xl emoji">☕</span>
              <span>Break Management</span>
            </h3>
            
            <div className="space-y-4">
              {!isCheckedIn ? (
                <div className="text-center py-8 border border-amber-400/20 bg-amber-500/5 rounded-lg">
                  <span className="text-4xl mb-4 floating emoji block">🛑</span>
                  <p className="text-amber-200/80 font-medium">
                    Check in first to manage your breaks
                  </p>
                </div>
              ) : isOnBreak ? (
                <button
                  onClick={handleEndBreak}
                  disabled={isProcessing}
                  className="w-full glass-button glass-button-success py-4 text-lg disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin emoji mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="emoji mr-2">▶️</span>
                      End Break
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={breakNote}
                    onChange={(e) => setBreakNote(e.target.value)}
                    placeholder="Break reason (optional)"
                    className="glass-input"
                  />
                  <button
                    onClick={handleStartBreak}
                    disabled={isProcessing}
                    className="w-full glass-button glass-button-warning py-4 text-lg disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin emoji mr-2">⏳</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="emoji mr-2">⏸️</span>
                        Start Break
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Today's Breaks */}
              {breaks && breaks.length > 0 && (
                <div className="glass rounded-lg border border-amber-400/20 bg-amber-500/5 p-4">
                  <div className="text-amber-300 mb-3 font-medium flex items-center space-x-2">
                    <span className="emoji">🍃</span>
                    <span>Today's Breaks</span>
                  </div>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {breaks.map((breakItem, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-300">
                          {formatTime(breakItem.breakStart)} - {breakItem.breakEnd ? formatTime(breakItem.breakEnd) : 'Active'}
                        </span>
                        <span className="text-amber-300">
                          {breakItem.breakDuration ? formatDuration(breakItem.breakDuration) : 'In progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-amber-400/20 pt-2 mt-3 flex justify-between text-sm">
                    <span className="text-gray-300">Total Break Time:</span>
                    <span className="text-amber-400 font-bold">{formatDuration(getTotalBreakTime())}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Work Log Section */}
        <div className="glass-card">
          <h3 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
            <span className="text-2xl emoji">📋</span>
            <span>Daily Work Log</span>
            <span className="text-rose-400">*</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-purple-200 mb-2 flex items-center space-x-2">
                <span className="emoji">📝</span>
                <span>Work Log (Required for checkout)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your work today: tasks completed, meetings attended, achievements..."
                className={`w-full h-32 px-4 py-3 ${
                  !notes || notes.trim().length === 0
                    ? 'border-rose-400/50 focus:border-rose-400/70 bg-rose-500/5'
                    : notes.trim().length < 50
                    ? 'border-amber-400/50 focus:border-amber-400/70 bg-amber-500/5'
                    : 'border-emerald-400/70 focus:border-emerald-500/80 bg-emerald-500/5'
                } glass-input resize-none`}
              />
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className={`${
                  !notes || notes.trim().length === 0
                    ? 'text-rose-300'
                    : notes.trim().length < 50
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}>
                  {notes.trim().length} characters
                  {notes.trim().length < 50 ? ` (${50 - notes.trim().length} more needed)` : ' ✓'}
                </span>
                <span className="text-purple-300">
                  💡 Be detailed about your accomplishments
                </span>
              </div>
            </div>
            
            {hasCheckedOut ? (
              <div className="glass rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
                <span className="text-emerald-300 font-medium flex items-center justify-center space-x-2">
                  <span className="emoji">✅</span>
                  <span>Work log submitted successfully</span>
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center space-x-2 text-rose-300 bg-rose-500/10 p-3 rounded-lg border border-rose-400/20 text-sm">
                  <span className="emoji">🔴</span>
                  <span>Work log required</span>
                </div>
                <div className="flex items-center space-x-2 text-amber-300 bg-amber-500/10 p-3 rounded-lg border border-amber-400/20 text-sm">
                  <span className="emoji">⚠️</span>
                  <span>Min 50 characters</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-300 bg-blue-500/10 p-3 rounded-lg border border-blue-400/20 text-sm">
                  <span className="emoji">💡</span>
                  <span>Colors guide status</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard; 