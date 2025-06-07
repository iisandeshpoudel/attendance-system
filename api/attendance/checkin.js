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

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const checkInTime = now.toISOString();

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