import { verifyAuthToken } from '../utils/auth.js';
import { query } from '../utils/database.js';

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

    // Get break ID from request body (optional - will end the active break if not provided)
    const { breakId } = req.body || {};

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const breakEndTime = now.toISOString();

    // Get today's attendance record
    const attendanceResult = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (attendanceResult.length === 0) {
      return res.status(400).json({ 
        error: 'No attendance record found for today.' 
      });
    }

    const attendance = attendanceResult[0];

    // Find the active break to end
    let activeBreakQuery;
    let queryParams;

    if (breakId) {
      // End specific break by ID
      activeBreakQuery = `
        SELECT * FROM breaks 
        WHERE id = $1 AND attendance_id = $2 AND break_end IS NULL
      `;
      queryParams = [breakId, attendance.id];
    } else {
      // End the most recent active break
      activeBreakQuery = `
        SELECT * FROM breaks 
        WHERE attendance_id = $1 AND break_end IS NULL 
        ORDER BY break_start DESC 
        LIMIT 1
      `;
      queryParams = [attendance.id];
    }

    const activeBreakResult = await query(activeBreakQuery, queryParams);

    if (activeBreakResult.length === 0) {
      return res.status(400).json({ 
        error: 'No active break found to end.' 
      });
    }

    const activeBreak = activeBreakResult[0];

    // Calculate break duration in minutes
    const breakStartTime = new Date(activeBreak.break_start);
    const breakEndTimeObj = new Date(breakEndTime);
    const breakDurationMinutes = Math.round((breakEndTimeObj - breakStartTime) / (1000 * 60));

    // Update break record with end time and duration
    const updateResult = await query(
      `UPDATE breaks 
       SET break_end = $1, break_duration = $2 
       WHERE id = $3 
       RETURNING *`,
      [breakEndTime, breakDurationMinutes, activeBreak.id]
    );

    const updatedBreak = updateResult[0];

    res.status(200).json({
      success: true,
      message: 'Break ended successfully',
      break: {
        id: updatedBreak.id,
        attendanceId: updatedBreak.attendance_id,
        breakStart: updatedBreak.break_start,
        breakEnd: updatedBreak.break_end,
        breakDuration: updatedBreak.break_duration,
        breakNote: updatedBreak.break_note
      }
    });

  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 