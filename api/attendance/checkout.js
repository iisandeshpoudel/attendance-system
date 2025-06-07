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

  try {
    // Verify JWT token
    const decoded = verifyAuthToken(req);
    const userId = decoded.userId;

    // Get notes from request body
    const { notes } = req.body || {};

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const checkOutTime = now.toISOString();

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

    if (!attendance.check_in) {
      return res.status(400).json({ 
        error: 'Cannot check out without checking in first.' 
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({ 
        error: 'Already checked out today',
        checkOutTime: attendance.check_out 
      });
    }

    // Calculate total hours worked
    const checkInTime = new Date(attendance.check_in);
    const checkOutTimeObj = new Date(checkOutTime);
    const hoursWorked = (checkOutTimeObj - checkInTime) / (1000 * 60 * 60); // Convert to hours

    // Get total break time for today
    const breaksResult = await sql`
      SELECT SUM(break_duration) as total_break_minutes 
      FROM breaks 
      WHERE attendance_id = ${attendance.id} AND break_end IS NOT NULL
    `;

    const totalBreakMinutes = parseFloat(breaksResult[0]?.total_break_minutes || 0);
    const totalBreakHours = totalBreakMinutes / 60;

    // Calculate net working hours (subtract break time)
    const netHours = Math.max(0, hoursWorked - totalBreakHours);

    // Update attendance record with check-out time and total hours
    const updateResult = await sql`
      UPDATE attendance 
      SET check_out = ${checkOutTime}, total_hours = ${netHours.toFixed(2)}, notes = ${notes || null}, status = 'completed'
      WHERE id = ${attendance.id}
      RETURNING *
    `;

    const updatedRecord = updateResult[0];

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      attendance: {
        id: updatedRecord.id,
        date: updatedRecord.date,
        checkIn: updatedRecord.check_in,
        checkOut: updatedRecord.check_out,
        totalHours: parseFloat(updatedRecord.total_hours),
        notes: updatedRecord.notes,
        status: updatedRecord.status,
        breakTime: totalBreakMinutes
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 