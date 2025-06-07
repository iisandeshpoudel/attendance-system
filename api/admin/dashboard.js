import { verifyAuthToken } from '../utils/auth.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

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
    // Verify JWT token and admin role
    const decoded = verifyAuthToken(req);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get all employees with their today's attendance status - FIXED QUERY
    const employeesResult = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        a.id as attendance_id,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.notes,
        a.status as attendance_status,
        (SELECT COUNT(*) FROM breaks b WHERE b.attendance_id = a.id AND b.break_end IS NULL) as on_break
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ${today}
      WHERE u.role = 'employee'
      ORDER BY u.name ASC
    `;

    // Get summary statistics
    const stats = {
      totalEmployees: employeesResult.length,
      checkedIn: 0,
      onBreak: 0,
      checkedOut: 0,
      notStarted: 0
    };

    // Process employees and calculate status
    const employees = employeesResult.map(emp => {
      let status = 'not_started';
      
      if (emp.check_in && !emp.check_out) {
        status = emp.on_break > 0 ? 'on_break' : 'working';
      } else if (emp.check_out) {
        status = 'completed';
      }

      // Update stats
      switch (status) {
        case 'working':
          stats.checkedIn++;
          break;
        case 'on_break':
          stats.onBreak++;
          break;
        case 'completed':
          stats.checkedOut++;
          break;
        case 'not_started':
          stats.notStarted++;
          break;
      }

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        attendanceId: emp.attendance_id,
        checkIn: emp.check_in,
        checkOut: emp.check_out,
        totalHours: emp.total_hours,
        notes: emp.notes,
        status: status,
        attendanceStatus: emp.attendance_status
      };
    });

    // Get recent activity - FIXED QUERY
    const recentActivityResult = await sql`
      SELECT 
        u.name as employee_name,
        a.check_in,
        a.check_out,
        b.break_start,
        b.break_end
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ${today}
      LEFT JOIN breaks b ON a.id = b.attendance_id
      WHERE u.role = 'employee' 
        AND (a.check_in IS NOT NULL OR a.check_out IS NOT NULL OR b.break_start IS NOT NULL)
      ORDER BY 
        GREATEST(
          COALESCE(a.check_in, '1970-01-01'::timestamp),
          COALESCE(a.check_out, '1970-01-01'::timestamp),
          COALESCE(b.break_start, '1970-01-01'::timestamp),
          COALESCE(b.break_end, '1970-01-01'::timestamp)
        ) DESC
      LIMIT 10
    `;

    const recentActivity = recentActivityResult.map(activity => {
      if (activity.check_out) {
        return {
          employeeName: activity.employee_name,
          action: 'checked_out',
          timestamp: activity.check_out,
          message: `${activity.employee_name} checked out`
        };
      } else if (activity.break_end) {
        return {
          employeeName: activity.employee_name,
          action: 'ended_break',
          timestamp: activity.break_end,
          message: `${activity.employee_name} ended break`
        };
      } else if (activity.break_start && !activity.break_end) {
        return {
          employeeName: activity.employee_name,
          action: 'started_break',
          timestamp: activity.break_start,
          message: `${activity.employee_name} started break`
        };
      } else if (activity.check_in) {
        return {
          employeeName: activity.employee_name,
          action: 'checked_in',
          timestamp: activity.check_in,
          message: `${activity.employee_name} checked in`
        };
      }
      return null;
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        stats,
        employees,
        recentActivity,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 