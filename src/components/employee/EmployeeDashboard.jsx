import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../hooks/useAttendance';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const { 
    attendance, 
    breaks, 
    loading, 
    error,
    checkIn, 
    checkOut, 
    startBreak, 
    endBreak, 
    updateNotes 
  } = useAttendance();

  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const handleNotesUpdate = async () => {
    await updateNotes(notes);
  };

  const activeBreak = breaks?.find(b => !b.break_end);
  const isCheckedIn = attendance?.check_in && !attendance?.check_out;
  const isOnBreak = activeBreak && isCheckedIn;

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getTotalBreakTime = () => {
    if (!breaks) return 0;
    return breaks.reduce((total, breakItem) => {
      return total + (breakItem.break_duration || 0);
    }, 0);
  };

  const getWorkingTime = () => {
    if (!attendance?.check_in) return 0;
    const checkInTime = new Date(attendance.check_in);
    const currentOrCheckOut = attendance?.check_out ? new Date(attendance.check_out) : currentTime;
    return Math.floor((currentOrCheckOut - checkInTime) / 1000);
  };

  const getNetWorkingTime = () => {
    return getWorkingTime() - getTotalBreakTime();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center backdrop-blur-layers">
        <div className="glass-card luxury-shadow">
          <div className="flex items-center justify-center p-4 sm:p-6">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-purple-500 mr-3 sm:mr-4"></div>
            <span className="text-white text-base sm:text-lg lg:text-xl font-semibold">Loading your workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 backdrop-blur-layers">
      <div className="max-w-4xl lg:max-w-6xl mx-auto">
        {/* Premium Header */}
        <div className="glass-card mb-4 sm:mb-6 lg:mb-8 luxury-shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold gradient-text mb-1 sm:mb-2 lg:mb-3">
                Employee Dashboard
              </h1>
              <p className="text-gray-300/90 text-sm sm:text-base lg:text-lg">
                Welcome, <span className="text-purple-300 font-semibold">{user?.name}</span>! 
                <span className="hidden sm:inline"> Track your time with precision and style.</span>
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 w-full sm:w-auto">
              <div className="glass rounded-lg sm:rounded-xl lg:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 backdrop-blur-layers flex-1 sm:flex-none">
                <div className="text-xs sm:text-sm font-medium text-gray-300 mb-0.5 sm:mb-1">Current Time</div>
                <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold gradient-text">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
              <button
                onClick={logout}
                className="glass-button bg-red-500/20 hover:bg-red-500/30 text-red-300 floating"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="glass-card border-l-4 border-red-400/50 bg-red-500/10 mb-4 sm:mb-6 lg:mb-8 luxury-shadow">
            <div className="font-semibold text-sm sm:text-base lg:text-lg text-red-300">
              {error}
            </div>
          </div>
        )}

        {/* Premium Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 xl:gap-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Check-in Status */}
          <div className={`${isCheckedIn ? 'status-card-success' : 'status-card-danger'}`}>
            <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
              <div className={`p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-md floating ${
                isCheckedIn ? 'bg-green-500/20' : 'bg-gray-500/20'
              }`}>
                <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl">{isCheckedIn ? '🟢' : '🔴'}</div>
              </div>
              <div>
                <div className="text-sm sm:text-base lg:text-lg xl:text-2xl font-bold text-white mb-0.5 sm:mb-1">
                  {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                </div>
                <div className={`text-xs sm:text-sm font-medium ${
                  isCheckedIn ? 'text-green-300' : 'text-gray-300'
                }`}>
                  {attendance?.check_in ? `Since ${formatTime(attendance.check_in)}` : 'Ready to start'}
                </div>
              </div>
            </div>
          </div>

          {/* Break Status */}
          <div className={`${isOnBreak ? 'status-card-warning' : 'status-card'}`}>
            <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
              <div className={`p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-md floating ${
                isOnBreak ? 'bg-yellow-500/20' : 'bg-purple-500/20'
              }`}>
                <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl">{isOnBreak ? '⏸️' : '▶️'}</div>
              </div>
              <div>
                <div className="text-sm sm:text-base lg:text-lg xl:text-2xl font-bold text-white mb-0.5 sm:mb-1">
                  {isOnBreak ? 'On Break' : 'Working'}
                </div>
                <div className={`text-xs sm:text-sm font-medium ${
                  isOnBreak ? 'text-yellow-300' : 'text-purple-300'
                }`}>
                  {isOnBreak ? `Since ${formatTime(activeBreak.break_start)}` : 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* Working Time */}
          <div className="status-card sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
              <div className="p-2 sm:p-3 lg:p-4 bg-purple-500/20 rounded-lg sm:rounded-xl lg:rounded-2xl backdrop-blur-md floating">
                <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl">⏱️</div>
              </div>
              <div>
                <div className="text-sm sm:text-base lg:text-lg xl:text-2xl font-bold text-white mb-0.5 sm:mb-1">
                  {formatDuration(getNetWorkingTime())}
                </div>
                <div className="text-xs sm:text-sm font-medium text-purple-300">
                  Net Working Time
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Action Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Check-in/Check-out Card */}
          <div className="glass-card luxury-shadow">
            <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold gradient-text mb-3 sm:mb-4 lg:mb-6">
              Time Tracking
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {!isCheckedIn ? (
                <button
                  onClick={checkIn}
                  className="w-full glass-button bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-3 sm:py-4 lg:py-6 text-sm sm:text-base lg:text-xl floating"
                >
                  🚀 Check In
                </button>
              ) : (
                <button
                  onClick={checkOut}
                  className="w-full glass-button bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-3 sm:py-4 lg:py-6 text-sm sm:text-base lg:text-xl floating"
                >
                  🏁 Check Out
                </button>
              )}
              
              {isCheckedIn && (
                <div className="mt-3 sm:mt-4 lg:mt-6 p-3 sm:p-4 glass rounded-lg sm:rounded-xl">
                  <div className="text-xs sm:text-sm text-gray-300 mb-1 sm:mb-2">Today's Schedule</div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-xs sm:text-sm">Check-in:</span>
                      <span className="text-white font-medium text-xs sm:text-sm">{formatTime(attendance.check_in)}</span>
                    </div>
                    {attendance?.check_out && (
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-xs sm:text-sm">Check-out:</span>
                        <span className="text-white font-medium text-xs sm:text-sm">{formatTime(attendance.check_out)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-white/10 pt-1 sm:pt-2">
                      <span className="text-gray-300 text-xs sm:text-sm">Total Time:</span>
                      <span className="text-purple-300 font-bold text-xs sm:text-sm">{formatDuration(getWorkingTime())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Break Management Card */}
          <div className="glass-card luxury-shadow">
            <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold gradient-text mb-3 sm:mb-4 lg:mb-6">
              Break Management
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {!isCheckedIn ? (
                <div className="text-center py-4 sm:py-6 lg:py-8">
                  <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-4">☕</div>
                  <p className="text-gray-300/80 text-xs sm:text-sm">
                    Check in first to manage your breaks
                  </p>
                </div>
              ) : isOnBreak ? (
                <button
                  onClick={endBreak}
                  className="w-full glass-button bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 sm:py-4 lg:py-6 text-sm sm:text-base lg:text-xl floating"
                >
                  ⏰ End Break
                </button>
              ) : (
                <button
                  onClick={startBreak}
                  className="w-full glass-button bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-bold py-3 sm:py-4 lg:py-6 text-sm sm:text-base lg:text-xl floating"
                >
                  ☕ Start Break
                </button>
              )}

              {breaks && breaks.length > 0 && (
                <div className="mt-3 sm:mt-4 lg:mt-6 p-3 sm:p-4 glass rounded-lg sm:rounded-xl">
                  <div className="text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3">Today's Breaks</div>
                  <div className="space-y-1 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
                    {breaks.map((breakItem, index) => (
                      <div key={index} className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-300">
                          {formatTime(breakItem.break_start)} - {breakItem.break_end ? formatTime(breakItem.break_end) : 'Active'}
                        </span>
                        <span className="text-purple-300 font-medium">
                          {breakItem.break_duration ? formatDuration(breakItem.break_duration) : 'In progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-1 sm:pt-2 mt-2 sm:mt-3 flex justify-between">
                    <span className="text-gray-300 text-xs sm:text-sm">Total Break Time:</span>
                    <span className="text-yellow-300 font-bold text-xs sm:text-sm">{formatDuration(getTotalBreakTime())}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premium Notes Section */}
        <div className="glass-card luxury-shadow">
          <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold gradient-text mb-3 sm:mb-4 lg:mb-6">
            Daily Notes
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your work today..."
              className="glass-input w-full h-20 sm:h-24 lg:h-32 resize-none text-sm sm:text-base lg:text-lg"
            />
            <button
              onClick={handleNotesUpdate}
              className="glass-button bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 floating"
            >
              💾 Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard; 