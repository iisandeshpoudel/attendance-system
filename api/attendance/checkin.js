import { verifyAuthToken } from '../utils/auth.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

// Integrated system configuration check - avoid separate utility function
async function validateWeekendWork(date) {
  try {
    // Check if system configuration is enabled
    const configResult = await sql`
      SELECT setting_value 
      FROM system_settings 
      WHERE setting_key = 'system_configuration_enabled'
    `;
    
    const isConfigEnabled = configResult.length === 0 || configResult[0].setting_value === 'true';
    
    // If system configuration is disabled (flexible mode), allow everything
    if (!isConfigEnabled) {
      return { allowed: true, reason: 'Flexible mode - all actions allowed' };
    }
    
    // Check if it's weekend
    const currentDate = new Date(date);
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6; // Sunday = 0, Saturday = 6
    
    if (!isWeekend) {
      return { allowed: true }; // Not weekend, allow
    }
    
    // Check weekend work setting
    const weekendResult = await sql`
      SELECT setting_value 
      FROM system_settings 
      WHERE setting_key = 'weekend_work_allowed'
    `;
    
    const weekendAllowed = weekendResult.length > 0 && weekendResult[0].setting_value === 'true';
    
    if (!weekendAllowed) {
      return { 
        allowed: false, 
        reason: 'Weekend work is not allowed according to company policy. Contact admin if this is urgent.' 
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error validating weekend work:', error);
    return { allowed: true }; // Allow on error
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const decoded = verifyAuthToken(req);
    const userId = decoded.userId;

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const checkInTime = now.toISOString();

    // Validate weekend work if system configuration is enabled
    const weekendValidation = await validateWeekendWork(today);
    if (!weekendValidation.allowed) {
      return res.status(400).json({ 
        error: weekendValidation.reason,
        isWeekend: true,
        flexibleModeHint: 'Contact your admin to enable Flexible Mode for weekend work during special projects.'
      });
    }

    // Get system settings
    const settings = await sql`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN ('system_configuration_enabled', 'work_start_time')
    `;

    const configEnabled = settings.find(s => s.setting_key === 'system_configuration_enabled')?.setting_value === 'true';
    const workStartTime = settings.find(s => s.setting_key === 'work_start_time')?.setting_value || '09:00';

    // Validate check-in time in configured mode
    if (configEnabled) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [startHour, startMinute] = workStartTime.split(':').map(Number);
      
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const startTimeInMinutes = startHour * 60 + startMinute;
      
      if (currentTimeInMinutes < startTimeInMinutes) {
        const timeUntilStart = startTimeInMinutes - currentTimeInMinutes;
        const hoursUntilStart = Math.floor(timeUntilStart / 60);
        const minutesUntilStart = timeUntilStart % 60;
        
        const formattedStartTime = new Date(`2000-01-01T${workStartTime}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        return res.status(400).json({ 
          error: `Check-in is only allowed after ${formattedStartTime}`,
          flexibleModeHint: 'Contact your admin to enable Flexible Mode for flexible work hours.'
        });
      }
    }

    // Check if user already has attendance record for today
    const existingRecord = await sql`
      SELECT * FROM attendance WHERE user_id = ${userId} AND date = ${today}
    `;

    if (existingRecord.length > 0) {
      const record = existingRecord[0];
      if (record.check_in) {
        return res.status(400).json({ 
          error: 'Already checked in today',
          checkInTime: record.check_in 
        });
      }
    }

    // Create or update attendance record with check-in time
    const result = await sql`
      INSERT INTO attendance (user_id, date, check_in, status) 
      VALUES (${userId}, ${today}, ${checkInTime}, 'active') 
      ON CONFLICT (user_id, date) 
      DO UPDATE SET check_in = ${checkInTime}, status = 'active'
      RETURNING *
    `;

    const attendanceRecord = result[0];

    res.status(200).json({
      success: true,
      message: 'Checked in successfully',
      attendance: {
        id: attendanceRecord.id,
        date: attendanceRecord.date,
        checkIn: attendanceRecord.check_in,
        status: attendanceRecord.status
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 