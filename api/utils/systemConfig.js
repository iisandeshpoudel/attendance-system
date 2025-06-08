import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

/**
 * Check if system configuration enforcement is enabled
 * @returns {Promise<boolean>} true if rules should be enforced, false for flexible mode
 */
export async function isSystemConfigurationEnabled() {
  try {
    const result = await sql`
      SELECT setting_value 
      FROM system_settings 
      WHERE setting_key = 'system_configuration_enabled'
    `;
    
    if (result.length === 0) {
      // Default to enabled if setting doesn't exist
      return true;
    }
    
    return result[0].setting_value === 'true';
  } catch (error) {
    console.error('Error checking system configuration status:', error);
    // Default to enabled on error for safety
    return true;
  }
}

/**
 * Get all system settings with configuration status
 * @returns {Promise<object>} Object containing all settings and configuration status
 */
export async function getSystemConfiguration() {
  try {
    const settings = await sql`
      SELECT setting_key, setting_value 
      FROM system_settings 
      ORDER BY setting_key
    `;
    
    const config = {};
    settings.forEach(setting => {
      config[setting.setting_key] = setting.setting_value;
    });
    
    const isEnabled = config.system_configuration_enabled === 'true';
    
    return {
      isEnabled,
      settings: config,
      mode: isEnabled ? 'configured' : 'flexible'
    };
  } catch (error) {
    console.error('Error getting system configuration:', error);
    return {
      isEnabled: true,
      settings: {},
      mode: 'configured'
    };
  }
}

/**
 * Validate if an action is allowed based on current system configuration
 * @param {string} action - The action to validate (e.g., 'weekend_work', 'overtime', 'break_limit')
 * @param {object} data - Action data (e.g., current time, break duration, etc.)
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function validateAction(action, data = {}) {
  const config = await getSystemConfiguration();
  
  // If system configuration is disabled (flexible mode), allow everything
  if (!config.isEnabled) {
    return { allowed: true, reason: 'Flexible mode - all actions allowed' };
  }
  
  // Enforce rules based on action type
  switch (action) {
    case 'weekend_work':
      const isWeekend = data.date ? new Date(data.date).getDay() % 6 === 0 : false;
      if (isWeekend && config.settings.weekend_work_allowed === 'false') {
        return { 
          allowed: false, 
          reason: 'Weekend work is not allowed according to company policy. Contact admin if this is urgent.' 
        };
      }
      break;
      
    case 'break_limit':
      const breakLimit = parseInt(config.settings.break_duration_limit || 60);
      const totalBreakMinutes = data.totalBreakMinutes || 0;
      if (totalBreakMinutes >= breakLimit) {
        return { 
          allowed: false, 
          reason: `Daily break limit of ${breakLimit} minutes reached. Please contact your supervisor for extended breaks.` 
        };
      }
      break;
      
    case 'work_hours':
      const startTime = config.settings.work_start_time || '09:00';
      const endTime = config.settings.work_end_time || '17:00';
      const currentTime = data.time ? data.time.substring(11, 16) : new Date().toTimeString().substring(0, 5);
      
      if (data.action === 'check_in' && currentTime < startTime) {
        return { 
          allowed: true, 
          reason: `Early check-in before official start time (${startTime}). This will be noted in your attendance.` 
        };
      }
      
      if (data.action === 'check_out' && currentTime > endTime) {
        const overtimeThreshold = parseFloat(config.settings.overtime_threshold || 8);
        return { 
          allowed: true, 
          reason: `Working beyond standard hours. Overtime threshold: ${overtimeThreshold} hours.` 
        };
      }
      break;
  }
  
  return { allowed: true };
}

/**
 * Get user-friendly status message for current configuration mode
 * @returns {Promise<string>}
 */
export async function getConfigurationStatusMessage() {
  const config = await getSystemConfiguration();
  
  if (config.isEnabled) {
    return "System is in Configured Mode - work policies and time restrictions are enforced.";
  } else {
    return "System is in Flexible Mode - employees can work any time with no restrictions. Perfect for holidays and special projects!";
  }
} 