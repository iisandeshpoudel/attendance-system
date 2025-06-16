import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../hooks/useAttendance';
import APP_CONFIG from '../../utils/config';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const { 
    attendance, 
    breaks, 
    summary,
    systemMode,
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh attendance data every 15 seconds for better real-time updates
  useEffect(() => {
    if (!loading) {
      const refreshTimer = setInterval(() => {
        refresh();
      }, 15000); // Reduced to 15 seconds for better system mode responsiveness
      return () => clearInterval(refreshTimer);
    }
  }, [loading, refresh]);

  // Debug system mode changes
  useEffect(() => {
    if (APP_CONFIG.ENABLE_DEBUG_LOGGING) {
      console.log('System mode updated:', systemMode);
    }
  }, [systemMode]);

  useEffect(() => {
    if (attendance?.notes) {
      setNotes(attendance.notes);
    }
  }, [attendance]);

  // Debug effect to understand data flow (only in development)
  useEffect(() => {
    if (APP_CONFIG.ENABLE_DEBUG_LOGGING) {
      console.log('Attendance Data:', {
        attendance,
        summary,
        isCheckedIn,
        isOnBreak,
        workingTime: getWorkingTime(),
        totalBreakTime: getTotalBreakTime(),
        netWorkingTime: getNetWorkingTime()
      });
    }
  }, [attendance, summary, currentTime]);

  const handleCheckIn = async () => {
    if (isProcessing) return;
    
    // Prevent double-click race condition
    if (loading) {
      setCheckoutError('Please wait, checking attendance status...');
      return;
    }
    
    setIsProcessing(true);
    setCheckoutError('');
    
    try {
      const result = await checkIn();
      if (!result.success) {
        setCheckoutError(result.error);
      } else {
        // Refresh attendance data after successful check-in
        await refresh();
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
    
    if (notes.trim().length < 30) {
      setCheckoutError('Work log must be at least 30 characters long.');
      return;
    }
    
    setIsProcessing(true);
    setCheckoutError('');
    
    try {
      const result = await checkOut(notes);
      if (!result.success) {
        setCheckoutError(result.error);
      } else {
        // Refresh attendance data after successful check-out
        await refresh();
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
      } else {
        // Refresh attendance data after successful break start
        await refresh();
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
      } else {
        // Refresh attendance data after successful break end
        await refresh();
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes < 0) return '0s';
    
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getWorkingTime = () => {
    // If attendance data has check_in time, use it
    if (attendance?.check_in) {
      const checkInTime = new Date(attendance.check_in);
      const currentOrCheckOut = attendance?.check_out ? new Date(attendance.check_out) : currentTime;
      return (currentOrCheckOut - checkInTime) / (1000 * 60); // Returns minutes with decimal precision
    }
    
    // If summary indicates user is checked in but attendance data is not yet available
    // This can happen right after check-in before data refresh
    if (isCheckedIn && summary?.checkInTime) {
      const checkInTime = new Date(summary.checkInTime);
      const currentOrCheckOut = summary?.checkOutTime ? new Date(summary.checkOutTime) : currentTime;
      return (currentOrCheckOut - checkInTime) / (1000 * 60);
    }
    
    return 0;
  };

  const getTotalBreakTime = () => {
    return summary?.totalBreakMinutes || 0;
  };

  const getNetWorkingTime = () => {
    const workingMinutes = getWorkingTime();
    const breakMinutes = getTotalBreakTime();
    return Math.max(0, workingMinutes - breakMinutes);
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
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="glass-card">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-2">
                Employee Dashboard
              </h1>
              <p className="text-purple-200/80">
                Welcome back, <span className="text-purple-300 font-medium">{user?.name}</span>! 
                Track your attendance with ease.
              </p>
              <p className="text-xs text-purple-400 mt-1">
                {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* 1. Today's Status & Policies */}
              <div className="glass rounded-lg px-4 py-2 floating min-w-[280px]">
                <div className="text-xs font-medium text-purple-300 mb-2">Today's Status & Policies</div>
                <div className="text-xs text-gray-300 leading-relaxed space-y-1.5">
                  {/* Break Policy */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className="emoji">☕</span>
                      <span>Break policy:</span>
                    </div>
                    <span className={`font-medium ${systemMode === 'flexible' ? 'text-amber-300' : 'text-blue-300'}`}>
                      {systemMode === 'flexible' ? 'Unlimited' : '60min max'}
                    </span>
                  </div>
                  {/* System Check-in/out Times (only in configured mode) */}
                  {systemMode === 'configured' && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="emoji">🕘</span>
                          <span>System check-in:</span>
                        </div>
                        <span className="text-emerald-300 font-medium">9:00 AM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="emoji">🕔</span>
                          <span>System check-out:</span>
                        </div>
                        <span className="text-blue-300 font-medium">5:00 PM</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* 2. System Mode (match admin Total Employees card) */}
              <div className="glass rounded-lg px-4 py-2 floating flex flex-col items-center justify-center min-w-[150px] min-h-[64px]">
                <div className="text-xs font-medium text-purple-300 mb-1">System Mode</div>
                <div className="text-2xl font-bold gradient-text flex items-center justify-center">
                  <span className="mr-2">{systemMode === 'flexible' ? '🍃' : '✅'}</span>
                  <span>{systemMode === 'flexible' ? 'Flexible Mode' : 'Configured Mode'}</span>
                </div>
              </div>
              {/* 3. Logout Button (match admin height/style) */}
              <button
                onClick={logout}
                className="glass-button glass-button-danger font-medium px-4 py-2 floating min-h-[64px] flex items-center justify-center"
                title="Logout"
              >
                <span className="emoji mr-2">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {checkoutError && (
          <div className="glass-card border-l-4 border-rose-400 bg-rose-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg emoji">⚠️</span>
                <div>
                  <p className="text-rose-300 font-medium text-sm">Action Required</p>
                  <p className="text-rose-200 text-sm">{checkoutError}</p>
                  {checkoutError.includes('Flexible Mode') && (
                    <p className="text-rose-200/70 text-xs mt-1">
                      💡 Your admin can temporarily disable work restrictions for special projects or holidays.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setCheckoutError('')}
                className="text-rose-400 hover:text-rose-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${isCheckedIn ? 'status-card-success' : 'status-card-danger'} floating`}>
            <div className="status-content">
              <div className={`w-10 h-10 rounded-lg icon-container ${
                isCheckedIn ? 'bg-emerald-500/20' : 'bg-rose-500/20'
              }`}>
                <span className="text-xl emoji">{isCheckedIn ? '🟢' : '🔴'}</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {isCheckedIn ? 'In' : 'Out'}
                </div>
                <div className={`text-xs font-medium ${
                  isCheckedIn ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {isCheckedIn ? 'Working' : 'Not Started'}
                </div>
              </div>
            </div>
          </div>

          <div className={`${isOnBreak ? 'status-card-warning' : 'status-card-info'} floating`}>
            <div className="status-content">
              <div className={`w-10 h-10 rounded-lg icon-container ${
                isOnBreak ? 'bg-amber-500/20' : 'bg-blue-500/20'
              }`}>
                <span className="text-xl emoji">{isOnBreak ? '⏸️' : '▶️'}</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatDuration(getTotalBreakTime())}
                </div>
                <div className={`text-xs font-medium ${
                  isOnBreak ? 'text-amber-300' : 'text-blue-300'
                }`}>
                  {isOnBreak ? 'On Break' : 'Total Breaks'}
                </div>
              </div>
            </div>
          </div>

          <div className="status-card-info floating">
            <div className="status-content">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg icon-container">
                <span className="text-xl emoji">⏱️</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatDuration(getWorkingTime())}
                </div>
                <div className="text-xs font-medium text-indigo-300">Total Time</div>
              </div>
            </div>
          </div>

          <div className="status-card-success floating">
            <div className="status-content">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg icon-container">
                <span className="text-xl emoji">⌚</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatDuration(getNetWorkingTime())}
                </div>
                <div className="text-xs font-medium text-emerald-300">Net Working</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Time Tracking */}
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold gradient-text flex items-center space-x-2">
                <span className="text-2xl emoji">⏱️</span>
                <span>Time Tracking</span>
              </h3>
              {isCheckedIn && (
                <div className="text-xs text-purple-400 px-3 py-1 bg-purple-500/10 rounded-lg border border-purple-400/20">
                  <span className="emoji mr-1">🟢</span>
                  Active
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {!isCheckedIn && !hasCheckedOut ? (
                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="w-full glass-button glass-button-success py-3 text-base font-medium disabled:opacity-50 floating"
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
                  disabled={isProcessing || !notes.trim() || notes.trim().length < 30}
                  className="w-full glass-button glass-button-danger py-3 text-base font-medium disabled:opacity-50 floating"
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
                <div className="text-center py-4 glass border border-emerald-400/30 bg-emerald-500/10 rounded-lg floating">
                  <span className="text-lg emoji mb-2 block">✅</span>
                  <div className="text-emerald-300 font-medium text-sm">
                    Work Complete
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">
                    {attendance?.total_hours || 0} hours today
                  </div>
                </div>
              )}
              
              {/* Today's Schedule */}
              {(attendance || isCheckedIn) && (
                <div className="glass border border-blue-400/20 bg-blue-500/5 rounded-lg p-4 floating">
                  <div className="text-blue-300 mb-3 font-medium flex items-center space-x-2">
                    <span className="emoji">📊</span>
                    <span>Today's Summary</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Check-in:</span>
                      <span className="text-white font-medium">
                        {attendance?.check_in ? formatTime(attendance.check_in) : (isCheckedIn ? 'Just Checked In' : 'Not Started')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Time:</span>
                      <span className="text-indigo-300 font-medium">{formatDuration(getWorkingTime())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Break Time:</span>
                      <span className="text-amber-300 font-medium">{formatDuration(getTotalBreakTime())}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600/50 pt-2">
                      <span className="text-gray-400">Net Working:</span>
                      <span className="text-emerald-300 font-bold">{formatDuration(getNetWorkingTime())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Break Management */}
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold gradient-text flex items-center space-x-2">
                <span className="text-2xl emoji">☕</span>
                <span>Break Management</span>
              </h3>
              {isOnBreak && (
                <div className="text-xs text-amber-400 px-3 py-1 bg-amber-500/10 rounded-lg border border-amber-400/20">
                  <span className="emoji mr-1">⏸️</span>
                  On Break
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {!isCheckedIn ? (
                <div className="text-center py-6 glass border border-amber-400/20 bg-amber-500/5 rounded-lg floating">
                  <span className="text-2xl mb-3 emoji block">🛑</span>
                  <p className="text-amber-300 font-medium text-sm">
                    Check in first to manage breaks
                  </p>
                </div>
              ) : isOnBreak ? (
                <button
                  onClick={handleEndBreak}
                  disabled={isProcessing}
                  className="w-full glass-button glass-button-success py-3 text-base font-medium disabled:opacity-50 floating"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin emoji mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="emoji mr-2">▶️</span>
                      Resume Work
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
                    className="w-full glass-button glass-button-warning py-3 text-base font-medium disabled:opacity-50 floating"
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
                    : notes.trim().length < 30
                    ? 'border-amber-400/50 focus:border-amber-400/70 bg-amber-500/5'
                    : 'border-emerald-400/70 focus:border-emerald-500/80 bg-emerald-500/5'
                } glass-input resize-none`}
              />
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className={`${
                  !notes || notes.trim().length === 0
                    ? 'text-rose-300'
                    : notes.trim().length < 30
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}>
                  {notes.trim().length} characters
                  {notes.trim().length < 30 ? ` (${30 - notes.trim().length} more needed)` : ' ✓'}
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
                  <span>Min 30 characters</span>
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