import { verifyAuthToken } from '../../src/utils/auth.js';
import { query } from '../../src/utils/database.js';

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

    // Get break note from request body
    const { breakNote } = req.body || {};

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const breakStartTime = now.toISOString();

    // Get today's attendance record
    const attendanceResult = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (attendanceResult.length === 0) {
      return res.status(400).json({ 
        error: 'No attendance record found for today. Please check in first.' 
      });
    }

    const attendance = attendanceResult[0];

    if (!attendance.check_in) {
      return res.status(400).json({ 
        error: 'Cannot start break without checking in first.' 
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({ 
        error: 'Cannot start break after checking out.' 
      });
    }

    // Check if there's already an active break
    const activeBreakResult = await query(
      'SELECT * FROM breaks WHERE attendance_id = $1 AND break_end IS NULL',
      [attendance.id]
    );

    if (activeBreakResult.length > 0) {
      return res.status(400).json({ 
        error: 'You already have an active break. Please end the current break first.',
        activeBreak: {
          id: activeBreakResult[0].id,
          breakStart: activeBreakResult[0].break_start
        }
      });
    }

    // Create new break record
    const breakResult = await query(
      `INSERT INTO breaks (attendance_id, break_start, break_note) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [attendance.id, breakStartTime, breakNote || null]
    );

    const breakRecord = breakResult[0];

    res.status(200).json({
      success: true,
      message: 'Break started successfully',
      break: {
        id: breakRecord.id,
        attendanceId: breakRecord.attendance_id,
        breakStart: breakRecord.break_start,
        breakNote: breakRecord.break_note
      }
    });

  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 