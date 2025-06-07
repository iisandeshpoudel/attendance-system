import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

// Simple query function that uses template literals directly
export async function query(queryText, params = []) {
  try {
    // For compatibility with existing code that uses $1, $2 parameters
    // We'll convert to template literal syntax
    if (params.length > 0) {
      // Replace $1, $2, etc. with actual parameter values
      let processedQuery = queryText;
      params.forEach((param, index) => {
        const placeholder = `$${index + 1}`;
        // Escape single quotes and wrap in quotes for string parameters
        const escapedParam = typeof param === 'string' 
          ? `'${param.replace(/'/g, "''")}'` 
          : param;
        processedQuery = processedQuery.replace(new RegExp(`\\$${index + 1}`, 'g'), escapedParam);
      });
      
      // Execute the processed query
      const result = await sql.unsafe(processedQuery);
      return Array.isArray(result) ? result : [result];
    } else {
      // Direct query without parameters
      const result = await sql.unsafe(queryText);
      return Array.isArray(result) ? result : [result];
    }
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', queryText);
    console.error('Params:', params);
    throw error;
  }
}

// Helper function to get user by email
export async function getUserByEmail(email) {
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  return result[0] || null;
}

// Helper function to get user by ID
export async function getUserById(id) {
  const result = await sql`SELECT * FROM users WHERE id = ${id}`;
  return result[0] || null;
}

// Helper function to create attendance record
export async function createAttendanceRecord(userId, date) {
  const result = await sql`
    INSERT INTO attendance (user_id, date) 
    VALUES (${userId}, ${date}) 
    ON CONFLICT (user_id, date) DO NOTHING 
    RETURNING *
  `;
  return result[0] || null;
}

// Helper function to get today's attendance
export async function getTodayAttendance(userId, date) {
  const result = await sql`SELECT * FROM attendance WHERE user_id = ${userId} AND date = ${date}`;
  return result[0] || null;
}

// Helper function to update attendance check-in
export async function updateCheckIn(attendanceId, checkInTime) {
  const result = await sql`UPDATE attendance SET check_in = ${checkInTime} WHERE id = ${attendanceId} RETURNING *`;
  return result[0] || null;
}

// Helper function to update attendance check-out
export async function updateCheckOut(attendanceId, checkOutTime, totalHours) {
  const result = await sql`UPDATE attendance SET check_out = ${checkOutTime}, total_hours = ${totalHours} WHERE id = ${attendanceId} RETURNING *`;
  return result[0] || null;
}

// Helper function to update attendance notes
export async function updateAttendanceNotes(attendanceId, notes) {
  const result = await sql`UPDATE attendance SET notes = ${notes} WHERE id = ${attendanceId} RETURNING *`;
  return result[0] || null;
}

// Helper function to start break
export async function startBreak(attendanceId, breakStart, breakNote) {
  const result = await sql`INSERT INTO breaks (attendance_id, break_start, break_note) VALUES (${attendanceId}, ${breakStart}, ${breakNote}) RETURNING *`;
  return result[0] || null;
}

// Helper function to end break
export async function endBreak(breakId, breakEnd) {
  const result = await sql`UPDATE breaks SET break_end = ${breakEnd}, break_duration = EXTRACT(EPOCH FROM (${breakEnd}::timestamp - break_start))/60 WHERE id = ${breakId} RETURNING *`;
  return result[0] || null;
}

// Helper function to get active break
export async function getActiveBreak(attendanceId) {
  const result = await sql`SELECT * FROM breaks WHERE attendance_id = ${attendanceId} AND break_end IS NULL ORDER BY break_start DESC LIMIT 1`;
  return result[0] || null;
}

// Helper function to get all breaks for attendance
export async function getBreaksForAttendance(attendanceId) {
  const result = await sql`SELECT * FROM breaks WHERE attendance_id = ${attendanceId} ORDER BY break_start ASC`;
  return result;
} 