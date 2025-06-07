import { verifyAuthToken } from '../utils/auth.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

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

  const { action } = req.query;

  try {
    // Verify JWT token
    const decoded = verifyAuthToken(req);
    const userId = decoded.userId;

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get today's attendance record
    const attendanceResult = await sql`
      SELECT * FROM attendance WHERE user_id = ${userId} AND date = ${today}
    `;

    if (attendanceResult.length === 0) {
      return res.status(400).json({ 
        error: 'No attendance record found for today. Please check in first.' 
      });
    }

    const attendance = attendanceResult[0];

    if (action === 'start') {
      // START BREAK FUNCTIONALITY
      const { breakNote } = req.body || {};
      const breakStartTime = now.toISOString();

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
      const activeBreakResult = await sql`
        SELECT * FROM breaks WHERE attendance_id = ${attendance.id} AND break_end IS NULL
      `;

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
      const breakResult = await sql`
        INSERT INTO breaks (attendance_id, break_start, break_note) 
        VALUES (${attendance.id}, ${breakStartTime}, ${breakNote || null}) 
        RETURNING *
      `;

      const breakRecord = breakResult[0];

      return res.status(200).json({
        success: true,
        message: 'Break started successfully',
        break: {
          id: breakRecord.id,
          attendanceId: breakRecord.attendance_id,
          breakStart: breakRecord.break_start,
          breakNote: breakRecord.break_note
        }
      });

    } else if (action === 'end') {
      // END BREAK FUNCTIONALITY
      const breakEndTime = now.toISOString();

      if (!attendance.check_in) {
        return res.status(400).json({ 
          error: 'Cannot end break without checking in first.' 
        });
      }

      // Find the active break
      const activeBreakResult = await sql`
        SELECT * FROM breaks WHERE attendance_id = ${attendance.id} AND break_end IS NULL ORDER BY break_start DESC LIMIT 1
      `;

      if (activeBreakResult.length === 0) {
        return res.status(400).json({ 
          error: 'No active break found to end.' 
        });
      }

      const activeBreak = activeBreakResult[0];

      // Calculate break duration in minutes
      const breakStartTime = new Date(activeBreak.break_start);
      const breakEndTimeObj = new Date(breakEndTime);
      const breakDurationMinutes = Math.floor((breakEndTimeObj - breakStartTime) / (1000 * 60));

      // Update break record with end time and duration
      const updateResult = await sql`
        UPDATE breaks 
        SET break_end = ${breakEndTime}, break_duration = ${breakDurationMinutes}
        WHERE id = ${activeBreak.id}
        RETURNING *
      `;

      const updatedBreak = updateResult[0];

      return res.status(200).json({
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

    } else {
      return res.status(400).json({ 
        error: 'Invalid action. Use ?action=start or ?action=end' 
      });
    }

  } catch (error) {
    console.error('Break management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 