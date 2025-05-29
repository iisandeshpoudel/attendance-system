import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

export async function query(text, params = []) {
  try {
    const result = await sql.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to get user by email
export async function getUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result[0] || null;
}

// Helper function to get user by ID
export async function getUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result[0] || null;
}

// Helper function to create attendance record
export async function createAttendanceRecord(userId, date) {
  const result = await query(
    'INSERT INTO attendance (user_id, date) VALUES ($1, $2) ON CONFLICT (user_id, date) DO NOTHING RETURNING *',
    [userId, date]
  );
  return result[0] || null;
}

// Helper function to get today's attendance
export async function getTodayAttendance(userId, date) {
  const result = await query(
    'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
    [userId, date]
  );
  return result[0] || null;
}

// Helper function to update attendance check-in
export async function updateCheckIn(attendanceId, checkInTime) {
  const result = await query(
    'UPDATE attendance SET check_in = $1 WHERE id = $2 RETURNING *',
    [checkInTime, attendanceId]
  );
  return result[0] || null;
}

// Helper function to update attendance check-out
export async function updateCheckOut(attendanceId, checkOutTime, totalHours) {
  const result = await query(
    'UPDATE attendance SET check_out = $1, total_hours = $2 WHERE id = $3 RETURNING *',
    [checkOutTime, totalHours, attendanceId]
  );
  return result[0] || null;
}

// Helper function to update attendance notes
export async function updateAttendanceNotes(attendanceId, notes) {
  const result = await query(
    'UPDATE attendance SET notes = $1 WHERE id = $2 RETURNING *',
    [notes, attendanceId]
  );
  return result[0] || null;
}

// Helper function to start break
export async function startBreak(attendanceId, breakStart, breakNote) {
  const result = await query(
    'INSERT INTO breaks (attendance_id, break_start, break_note) VALUES ($1, $2, $3) RETURNING *',
    [attendanceId, breakStart, breakNote]
  );
  return result[0] || null;
}

// Helper function to end break
export async function endBreak(breakId, breakEnd) {
  const result = await query(
    'UPDATE breaks SET break_end = $1, break_duration = EXTRACT(EPOCH FROM ($1 - break_start)) WHERE id = $2 RETURNING *',
    [breakEnd, breakId]
  );
  return result[0] || null;
}

// Helper function to get active break
export async function getActiveBreak(attendanceId) {
  const result = await query(
    'SELECT * FROM breaks WHERE attendance_id = $1 AND break_end IS NULL ORDER BY break_start DESC LIMIT 1',
    [attendanceId]
  );
  return result[0] || null;
}

// Helper function to get all breaks for attendance
export async function getBreaksForAttendance(attendanceId) {
  const result = await query(
    'SELECT * FROM breaks WHERE attendance_id = $1 ORDER BY break_start ASC',
    [attendanceId]
  );
  return result;
} 