import { verifyAuthToken } from '../utils/auth.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const decoded = verifyAuthToken(req);
    const userId = decoded.userId;

    // Get current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get today's attendance record
    const attendanceResult = await sql`
      SELECT * FROM attendance WHERE user_id = ${userId} AND date = ${today}
    `;

    let attendanceRecord = null;
    let breaks = [];

    if (attendanceResult.length > 0) {
      attendanceRecord = attendanceResult[0];

      // Get breaks for today's attendance record
      const breaksResult = await sql`
        SELECT * FROM breaks 
        WHERE attendance_id = ${attendanceRecord.id} 
        ORDER BY break_start DESC
      `;

      breaks = breaksResult;
    }

    // Calculate current working time if checked in but not checked out
    let currentWorkingMinutes = 0;
    if (attendanceRecord?.check_in && !attendanceRecord?.check_out) {
      const checkInTime = new Date(attendanceRecord.check_in);
      const now = new Date();
      currentWorkingMinutes = Math.floor((now - checkInTime) / (1000 * 60));
    }

    // Calculate total break time
    const totalBreakMinutes = breaks.reduce((total, breakRecord) => {
      if (breakRecord.break_end) {
        return total + (breakRecord.break_duration || 0);
      }
      return total;
    }, 0);

    // Calculate net working time (subtract breaks)
    const netWorkingMinutes = Math.max(0, currentWorkingMinutes - totalBreakMinutes);

    // Get system configuration mode and settings
    let systemMode = 'configured'; // Default
    let systemSettings = {};
    try {
      const settings = await sql`
        SELECT setting_key, setting_value 
        FROM system_settings 
        WHERE setting_key IN ('system_configuration_enabled', 'work_start_time', 'work_end_time', 'break_duration_limit', 'overtime_threshold', 'auto_checkout_time', 'weekend_work_allowed')
      `;

      const configEnabled = settings.find(s => s.setting_key === 'system_configuration_enabled')?.setting_value === 'true';
      systemMode = configEnabled ? 'configured' : 'flexible';

      // Convert settings array to object
      systemSettings = settings.reduce((acc, setting) => {
        acc[setting.setting_key] = { value: setting.setting_value };
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching system settings:', error);
      // Keep default mode and empty settings
    }

    res.status(200).json({
      success: true,
      attendance: attendanceRecord ? {
        id: attendanceRecord.id,
        date: attendanceRecord.date,
        checkIn: attendanceRecord.check_in,
        checkOut: attendanceRecord.check_out,
        totalHours: attendanceRecord.total_hours,
        notes: attendanceRecord.notes,
        status: attendanceRecord.status
      } : null,
      breaks: breaks.map(b => ({
        id: b.id,
        breakStart: b.break_start,
        breakEnd: b.break_end,
        breakDuration: b.break_duration,
        breakNote: b.break_note
      })),
      summary: {
        isCheckedIn: !!attendanceRecord?.check_in && !attendanceRecord?.check_out,
        isCheckedOut: !!attendanceRecord?.check_out,
        currentWorkingMinutes,
        totalBreakMinutes,
        netWorkingMinutes,
        onBreak: breaks.some(b => b.break_start && !b.break_end)
      },
      systemMode: {
        mode: systemMode,
        system_configuration_enabled: systemMode === 'configured'
      },
      systemSettings
    });

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 