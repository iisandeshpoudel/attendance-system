import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../hooks/useAttendance';
import { APP_CONFIG } from '../../utils/config';

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
    refresh,
    systemSettings
  } = useAttendance();

  // Move these up before any hooks that use them
  const isCheckedIn = summary?.isCheckedIn || (attendance?.checkIn && !attendance?.checkOut);
  const isOnBreak = summary?.onBreak || false;
  const hasCheckedOut = summary?.isCheckedOut || !!attendance?.checkOut;

  const [notes, setNotes] = useState('');
  const [breakNote, setBreakNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkoutError, setCheckoutError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountName, setAccountName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [workingSeconds, setWorkingSeconds] = useState(0);
  const [netWorkingSeconds, setNetWorkingSeconds] = useState(0);
  const intervalRef = useRef(null);

  // Ticking current time for live updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  // --- Timer helpers ---
  // Returns seconds between two dates
  const secondsBetween = (a, b) => Math.max(0, Math.floor((b - a) / 1000));

  // Total Time: from check-in to now (or check-out)
  const getTotalTimeSeconds = () => {
    if (!attendance?.checkIn) return 0;
    const start = new Date(attendance.checkIn);
    const end = attendance?.checkOut ? new Date(attendance.checkOut) : currentTime;
    return secondsBetween(start, end);
  };

  // Total Breaks: sum of all completed breaks + live break
  const getTotalBreakSeconds = () => {
    let total = 0;
    if (breaks && breaks.length > 0) {
      for (const b of breaks) {
        if (b.breakStart && b.breakEnd) {
          total += secondsBetween(new Date(b.breakStart), new Date(b.breakEnd));
        } else if (b.breakStart && !b.breakEnd) {
          // Active break: add live ticking
          total += secondsBetween(new Date(b.breakStart), currentTime);
        }
      }
    }
    return total;
  };

  // Net Working: total time minus all breaks (including live break)
  const getNetWorkingSeconds = () => {
    let total = getTotalTimeSeconds();
    let breakSeconds = getTotalBreakSeconds();
    return Math.max(0, total - breakSeconds);
  };

  // Format seconds as hh:mm:ss
  const formatHMS = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(unit => String(unit).padStart(2, '0')).join(':');
  };

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

  // Add notification timeout cleanup
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000); // Clear after 5 seconds
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [notification]);

  // Live ticking logic for working/net working time
  useEffect(() => {
    // Set initial values on mount or data refresh
    if (attendance?.checkIn) {
      let start = new Date(attendance.checkIn);
      let end = attendance?.checkOut ? new Date(attendance.checkOut) : new Date();
      setWorkingSeconds(Math.floor((end - start) / 1000));
    } else {
      setWorkingSeconds(0);
    }
    // Net working: subtract breaks
    if (attendance?.checkIn) {
      let start = new Date(attendance.checkIn);
      let end = attendance?.checkOut ? new Date(attendance.checkOut) : new Date();
      let totalBreak = (summary?.totalBreakMinutes || 0) * 60;
      let net = Math.max(0, Math.floor((end - start) / 1000) - totalBreak);
      setNetWorkingSeconds(net);
    } else {
      setNetWorkingSeconds(0);
    }
  }, [attendance, summary]);

  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only tick if checked in and not checked out
    if (isCheckedIn && !hasCheckedOut) {
      try {
        intervalRef.current = setInterval(() => {
          setWorkingSeconds(prev => prev + 1);
          if (!isOnBreak) {
            setNetWorkingSeconds(prev => prev + 1);
          }
        }, 1000);
      } catch (error) {
        if (APP_CONFIG.ENABLE_DEBUG_LOGGING) {
          console.error('Error setting up timer interval:', error);
        }
      }
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isCheckedIn, hasCheckedOut, isOnBreak]);

  const handleCheckIn = async () => {
    if (isProcessing) return;
    
    // Prevent double-click race condition
    if (loading) {
      setCheckoutError('Please wait, checking attendance status...');
      return;
    }

    // Validate check-in time in configured mode
    if (systemMode === 'configured') {
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const [startHour, startMinute] = (systemSettings?.work_start_time?.value || '09:00').split(':').map(Number);
      
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const startTimeInMinutes = startHour * 60 + startMinute;
      
      if (currentTimeInMinutes < startTimeInMinutes) {
        const timeUntilStart = startTimeInMinutes - currentTimeInMinutes;
        const hoursUntilStart = Math.floor(timeUntilStart / 60);
        const minutesUntilStart = timeUntilStart % 60;
        
        setCheckoutError(`⏰ Check-in is only allowed after ${systemSettings?.work_start_time?.value || '09:00'} (${hoursUntilStart > 0 ? `${hoursUntilStart}h ` : ''}${minutesUntilStart}m remaining)`);
        return;
      }
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

    // Validate check-out time in configured mode
    if (systemMode === 'configured') {
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const [endHour, endMinute] = (systemSettings?.work_end_time?.value || '17:00').split(':').map(Number);
      
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      if (currentTimeInMinutes < endTimeInMinutes) {
        const timeUntilEnd = endTimeInMinutes - currentTimeInMinutes;
        const hoursUntilEnd = Math.floor(timeUntilEnd / 60);
        const minutesUntilEnd = timeUntilEnd % 60;
        
        setCheckoutError(`⏰ Check-out is only allowed after ${systemSettings?.work_end_time?.value || '17:00'} (${hoursUntilEnd > 0 ? `${hoursUntilEnd}h ` : ''}${minutesUntilEnd}m remaining)`);
        return;
      }
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

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
    if (attendance?.checkIn) {
      const checkInTime = new Date(attendance.checkIn);
      const currentOrCheckOut = attendance?.checkOut ? new Date(attendance.checkOut) : currentTime;
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

  const handleAccountSave = async () => {
    setAccountError('');
    setAccountSuccess('');
    setAccountLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: accountName,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccountSuccess('Account updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setAccountError(data.error || 'Failed to update account');
      }
    } catch (err) {
      setAccountError('Network error');
    }
    setAccountLoading(false);
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
      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md glass-card border-l-4 ${
          notification.type === 'success' ? 'border-emerald-400 bg-emerald-500/10' :
          notification.type === 'warning' ? 'border-amber-400 bg-amber-500/10' :
          'border-rose-400 bg-rose-500/10'
        }`}>
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-1">
                <p className={`font-medium ${
                  notification.type === 'success' ? 'text-emerald-300' :
                  notification.type === 'warning' ? 'text-amber-300' :
                  'text-rose-300'
                }`}>
                  {notification.message}
                </p>
                {notification.details && (
                  <p className="text-sm text-gray-300 mt-1">
                    {notification.details}
                  </p>
                )}
                {notification.hint && (
                  <p className="text-xs text-purple-300 mt-2">
                    💡 {notification.hint}
                  </p>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-gray-400 hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="glass-card">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-2">
                Employee Dashboard
              </h1>
              <p className="text-purple-200/80">
                Welcome back, <span className="text-purple-300 font-medium">{user?.name}</span>
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
                <div className="text-xs font-medium text-purple-300 mb-2">Status & Policies</div>
                <div className="text-xs text-gray-300 leading-relaxed space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className="emoji">☕</span>
                      <span>Break:</span>
                    </div>
                    <span className={`font-medium ${systemMode === 'flexible' ? 'text-amber-300' : 'text-blue-300'}`}>
                      {systemMode === 'flexible' ? 'Unlimited' : '60min max'}
                    </span>
                  </div>
                  {systemMode === 'configured' && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="emoji">🕘</span>
                          <span>Check-in:</span>
                        </div>
                        <span className="text-emerald-300 font-medium">
                          {systemSettings?.work_start_time?.value || '09:00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="emoji">🕔</span>
                          <span>Check-out:</span>
                        </div>
                        <span className="text-blue-300 font-medium">
                          {systemSettings?.work_end_time?.value || '17:00'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* 2. System Mode (match admin Total Employees card) */}
              <div className="glass rounded-lg px-4 py-2 floating flex flex-col items-center justify-center min-w-[150px] min-h-[64px]">
                <div className="text-xs font-medium text-purple-300 mb-1">Mode</div>
                <div className="text-2xl font-bold flex items-center justify-center">
                  <span className="mr-2">{systemMode === 'flexible' ? '🍃' : '⚙️'}</span>
                  <span className={systemMode === 'flexible' ? 'text-amber-300' : 'text-emerald-300'}>
                    {systemMode === 'flexible' ? 'Flexible' : 'Configured'}
                  </span>
                </div>
              </div>
              {/* 3. Account Info Button */}
              <button
                onClick={() => setShowAccountModal(true)}
                className="glass-button glass-button-primary font-medium px-4 py-2 floating min-h-[64px] flex items-center justify-center"
                title="Account Info"
              >
                <span className="emoji mr-2">👤</span>
                <span>Account Info</span>
              </button>
              {/* 4. Logout Button (match admin height/style) */}
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
                  {formatHMS(getTotalBreakSeconds())}
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
                  {formatHMS(getTotalTimeSeconds())}
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
                  {formatHMS(getNetWorkingSeconds())}
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
                        {attendance?.checkIn ? formatTime(attendance.checkIn) : (isCheckedIn ? formatTime(currentTime) : 'Not Started')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Time:</span>
                      <span className="text-indigo-300 font-medium">{formatHMS(getTotalTimeSeconds())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Break Time:</span>
                      <span className="text-amber-300 font-medium">{formatHMS(getTotalBreakSeconds())}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600/50 pt-2">
                      <span className="text-gray-400">Net Working:</span>
                      <span className="text-emerald-300 font-bold">{formatHMS(getNetWorkingSeconds())}</span>
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
                          {breakItem.breakStart && breakItem.breakEnd
                            ? formatHMS(secondsBetween(new Date(breakItem.breakStart), new Date(breakItem.breakEnd)))
                            : breakItem.breakStart && !breakItem.breakEnd
                            ? formatHMS(secondsBetween(new Date(breakItem.breakStart), currentTime))
                            : 'In progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-amber-400/20 pt-2 mt-3 flex justify-between text-sm">
                    <span className="text-gray-300">Total Break Time:</span>
                    <span className="text-amber-400 font-bold">{formatHMS(getTotalBreakSeconds())}</span>
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
                <span>Work Log</span>
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
                  {notes.trim().length < 30 ? ` (${30 - notes.trim().length} more)` : ' ✓'}
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

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="glass-card max-w-md w-full p-6 border border-violet-400/30 shadow-lg relative">
            <button
              className="absolute top-3 right-3 text-rose-400 hover:text-rose-300"
              onClick={() => setShowAccountModal(false)}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold gradient-text mb-4 flex items-center space-x-2">
              <span className="emoji">👤</span>
              <span>Account Info</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-purple-200 mb-2">Name</label>
                <input
                  type="text"
                  className="glass-input"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium text-purple-200 mb-2">Change Password</label>
                <input
                  type="password"
                  className="glass-input mb-2"
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
                <input
                  type="password"
                  className="glass-input mb-2"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <input
                  type="password"
                  className="glass-input"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
              {accountError && (
                <div className="p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg text-rose-300 text-sm flex items-center space-x-2">
                  <span className="emoji">⚠️</span>
                  <span>{accountError}</span>
                </div>
              )}
              {accountSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-400/30 rounded-lg text-emerald-300 text-sm flex items-center space-x-2">
                  <span className="emoji">✅</span>
                  <span>{accountSuccess}</span>
                </div>
              )}
              <button
                className="glass-button glass-button-success w-full font-medium py-3 mt-2"
                onClick={handleAccountSave}
                disabled={accountLoading}
              >
                {accountLoading ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <span className="emoji mr-2">💾</span>
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard; 