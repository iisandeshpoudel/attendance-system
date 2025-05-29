import { verifyAuthToken } from '../../src/utils/auth.js';
import { query } from '../../src/utils/database.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    const attendanceResult = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    let attendanceRecord = null;
    let breaks = [];

    if (attendanceResult.length > 0) {
      attendanceRecord = attendanceResult[0];

      // Get breaks for today's attendance record
      const breaksResult = await query(
        `SELECT * FROM breaks 
         WHERE attendance_id = $1 
         ORDER BY break_start DESC`,
        [attendanceRecord.id]
      );

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
      }
    });

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 