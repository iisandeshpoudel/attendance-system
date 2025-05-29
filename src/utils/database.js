import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

export async function query(text, params = []) {
  try {
    const result = await sql(text, params);
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