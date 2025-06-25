// Application Configuration
export const APP_CONFIG = {
  // Refresh intervals (in milliseconds)
  DASHBOARD_REFRESH_INTERVAL: 30000, // 30 seconds
  EMPLOYEE_REFRESH_INTERVAL: 30000,  // 30 seconds
  
  // Notification settings
  NOTIFICATION_DISMISS_TIME: {
    INFO: 6000,    // 6 seconds
    SUCCESS: 6000, // 6 seconds
    WARNING: 8000, // 8 seconds
    ERROR: 8000    // 8 seconds
  },
  
  // Work log validation
  WORK_LOG_MIN_LENGTH: 30,
  
  // Break duration settings
  MIN_BREAK_DURATION_MINUTES: 1,
  
  // Time formats
  TIME_FORMAT_OPTIONS: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  },
  
  // Development mode flags
  ENABLE_DEBUG_LOGGING: import.meta.env.DEV,
  
  // API configuration
  API_TIMEOUT: 10000, // 10 seconds
}; 