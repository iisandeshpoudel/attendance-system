import { verifyAuthToken } from '../utils/auth.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify JWT token and admin role
    const decoded = verifyAuthToken(req);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type } = req.query;

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, type);
      case 'POST':
        return await handlePost(req, res, type, decoded);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET handlers - Chart data, trends, statistics
async function handleGet(req, res, type) {
  switch (type) {
    case 'charts':
      return await getChartsData(req, res);
    
    case 'productivity':
      return await getProductivityMetrics(req, res);
    
    case 'trends':
      return await getTrendAnalysis(req, res);
    
    case 'compliance':
      return await getComplianceReport(req, res);
    
    case 'employee-stats':
      return await getEmployeeStatistics(req, res);
    
    default:
      return res.status(400).json({ error: 'Invalid analytics type' });
  }
}

// POST handlers - Custom reports, advanced filtering
async function handlePost(req, res, type, decoded) {
  switch (type) {
    case 'custom-report':
      return await generateCustomReport(req, res, decoded);
    
    case 'advanced-filter':
      return await performAdvancedFiltering(req, res);
    
    default:
      return res.status(400).json({ error: 'Invalid analytics type' });
  }
}

// Charts Data - For dashboard visualization
async function getChartsData(req, res) {
  const { days = 30 } = req.query;
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Daily attendance counts
    const dailyAttendance = await sql`
      SELECT 
        date,
        COUNT(*) as total_employees,
        SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END) as checked_in,
        SUM(CASE WHEN check_out IS NOT NULL THEN 1 ELSE 0 END) as checked_out,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        AVG(total_hours) as avg_hours
      FROM attendance 
      WHERE date >= ${startDateStr}
      GROUP BY date 
      ORDER BY date
    `;

    // Weekly trends
    const weeklyTrends = await sql`
      SELECT 
        EXTRACT(WEEK FROM date) as week_number,
        EXTRACT(YEAR FROM date) as year,
        COUNT(*) as total_records,
        AVG(total_hours) as avg_hours_per_day,
        SUM(total_hours) as total_hours_worked,
        COUNT(DISTINCT user_id) as unique_employees
      FROM attendance 
      WHERE date >= ${startDateStr} AND total_hours IS NOT NULL
      GROUP BY EXTRACT(WEEK FROM date), EXTRACT(YEAR FROM date)
      ORDER BY year, week_number
    `;

    // Break patterns
    const breakPatterns = await sql`
      SELECT 
        DATE(b.created_at) as date,
        COUNT(*) as total_breaks,
        AVG(b.break_duration) as avg_break_duration,
        SUM(b.break_duration) as total_break_time
      FROM breaks b
      INNER JOIN attendance a ON b.attendance_id = a.id
      WHERE a.date >= ${startDateStr} AND b.break_end IS NOT NULL
      GROUP BY DATE(b.created_at)
      ORDER BY date
    `;

    // Employee productivity comparison
    const employeeProductivity = await sql`
      SELECT 
        u.name as employee_name,
        COUNT(a.id) as days_worked,
        AVG(a.total_hours) as avg_daily_hours,
        SUM(a.total_hours) as total_hours,
        AVG(breaks_data.daily_breaks) as avg_daily_breaks,
        AVG(breaks_data.daily_break_time) as avg_daily_break_time
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.date >= ${startDateStr}
      LEFT JOIN (
        SELECT 
          a.user_id,
          a.date,
          COUNT(b.id) as daily_breaks,
          COALESCE(SUM(b.break_duration), 0) as daily_break_time
        FROM attendance a
        LEFT JOIN breaks b ON a.id = b.attendance_id AND b.break_end IS NOT NULL
        WHERE a.date >= ${startDateStr}
        GROUP BY a.user_id, a.date
      ) breaks_data ON u.id = breaks_data.user_id
      WHERE u.role = 'employee'
      GROUP BY u.id, u.name
      HAVING COUNT(a.id) > 0
      ORDER BY total_hours DESC
    `;

    res.status(200).json({
      success: true,
      data: {
        daily_attendance: dailyAttendance,
        weekly_trends: weeklyTrends,
        break_patterns: breakPatterns,
        employee_productivity: employeeProductivity,
        period: {
          days: parseInt(days),
          start_date: startDateStr,
          end_date: new Date().toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Charts data error:', error);
    res.status(500).json({ error: 'Failed to fetch charts data' });
  }
}

// Productivity Metrics
async function getProductivityMetrics(req, res) {
  const { employee_id, start_date, end_date } = req.query;
  
  try {
    let whereClause = '1=1';
    const params = [];

    if (employee_id) {
      whereClause += ` AND a.user_id = $${params.length + 1}`;
      params.push(parseInt(employee_id));
    }

    if (start_date) {
      whereClause += ` AND a.date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND a.date <= $${params.length + 1}`;
      params.push(end_date);
    }

    // Overall productivity metrics
    const overallMetrics = await sql.unsafe(`
      SELECT 
        COUNT(DISTINCT a.user_id) as total_active_employees,
        COUNT(a.id) as total_work_days,
        AVG(a.total_hours) as avg_hours_per_day,
        SUM(a.total_hours) as total_hours_worked,
        AVG(break_stats.daily_breaks) as avg_breaks_per_day,
        AVG(break_stats.daily_break_time) as avg_break_time_per_day,
        COUNT(CASE WHEN a.total_hours >= 8 THEN 1 END) as full_days_count,
        COUNT(CASE WHEN a.total_hours < 6 THEN 1 END) as short_days_count
      FROM attendance a
      LEFT JOIN (
        SELECT 
          a.id as attendance_id,
          COUNT(b.id) as daily_breaks,
          COALESCE(SUM(b.break_duration), 0) as daily_break_time
        FROM attendance a
        LEFT JOIN breaks b ON a.id = b.attendance_id AND b.break_end IS NOT NULL
        GROUP BY a.id
      ) break_stats ON a.id = break_stats.attendance_id
      WHERE ${whereClause} AND a.total_hours IS NOT NULL
    `, params);

    // Top performers
    const topPerformers = await sql.unsafe(`
      SELECT 
        u.name as employee_name,
        COUNT(a.id) as days_worked,
        AVG(a.total_hours) as avg_daily_hours,
        SUM(a.total_hours) as total_hours,
        (COUNT(CASE WHEN a.total_hours >= 8 THEN 1 END) * 100.0 / COUNT(a.id)) as full_day_percentage,
        AVG(break_stats.daily_break_time) as avg_break_time
      FROM users u
      INNER JOIN attendance a ON u.id = a.user_id
      LEFT JOIN (
        SELECT 
          a.id as attendance_id,
          COALESCE(SUM(b.break_duration), 0) as daily_break_time
        FROM attendance a
        LEFT JOIN breaks b ON a.id = b.attendance_id AND b.break_end IS NOT NULL
        GROUP BY a.id
      ) break_stats ON a.id = break_stats.attendance_id
      WHERE ${whereClause} AND a.total_hours IS NOT NULL AND u.role = 'employee'
      GROUP BY u.id, u.name
      HAVING COUNT(a.id) >= 1
      ORDER BY avg_daily_hours DESC, full_day_percentage DESC
      LIMIT 10
    `, params);

    // Attendance patterns
    const attendancePatterns = await sql.unsafe(`
      SELECT 
        EXTRACT(DOW FROM a.date) as day_of_week,
        COUNT(*) as total_records,
        AVG(a.total_hours) as avg_hours,
        COUNT(CASE WHEN a.check_in IS NOT NULL THEN 1 END) as check_ins,
        COUNT(CASE WHEN a.check_out IS NOT NULL THEN 1 END) as check_outs
      FROM attendance a
      WHERE ${whereClause}
      GROUP BY EXTRACT(DOW FROM a.date)
      ORDER BY day_of_week
    `, params);

    // Time distribution
    const timeDistribution = await sql.unsafe(`
      SELECT 
        CASE 
          WHEN a.total_hours < 4 THEN 'Under 4 hours'
          WHEN a.total_hours < 6 THEN '4-6 hours'
          WHEN a.total_hours < 8 THEN '6-8 hours'
          WHEN a.total_hours < 10 THEN '8-10 hours'
          ELSE 'Over 10 hours'
        END as hour_range,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()) as percentage
      FROM attendance a
      WHERE ${whereClause} AND a.total_hours IS NOT NULL
      GROUP BY 
        CASE 
          WHEN a.total_hours < 4 THEN 'Under 4 hours'
          WHEN a.total_hours < 6 THEN '4-6 hours'
          WHEN a.total_hours < 8 THEN '6-8 hours'
          WHEN a.total_hours < 10 THEN '8-10 hours'
          ELSE 'Over 10 hours'
        END
      ORDER BY MIN(a.total_hours)
    `, params);

    res.status(200).json({
      success: true,
      data: {
        overall_metrics: overallMetrics[0],
        top_performers: topPerformers,
        attendance_patterns: attendancePatterns,
        time_distribution: timeDistribution,
        filters_applied: { employee_id, start_date, end_date }
      }
    });

  } catch (error) {
    console.error('Productivity metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch productivity metrics' });
  }
}

// Trend Analysis
async function getTrendAnalysis(req, res) {
  const { period = 'weekly', metric = 'hours' } = req.query;
  
  try {
    let groupBy, selectPeriod;
    
    switch (period) {
      case 'daily':
        groupBy = 'a.date';
        selectPeriod = 'a.date as period';
        break;
      case 'weekly':
        groupBy = 'EXTRACT(WEEK FROM a.date), EXTRACT(YEAR FROM a.date)';
        selectPeriod = 'EXTRACT(YEAR FROM a.date) || \'-W\' || EXTRACT(WEEK FROM a.date) as period';
        break;
      case 'monthly':
        groupBy = 'EXTRACT(MONTH FROM a.date), EXTRACT(YEAR FROM a.date)';
        selectPeriod = 'EXTRACT(YEAR FROM a.date) || \'-\' || LPAD(EXTRACT(MONTH FROM a.date)::text, 2, \'0\') as period';
        break;
      default:
        groupBy = 'a.date';
        selectPeriod = 'a.date as period';
    }

    // Base trend query
    const trendData = await sql.unsafe(`
      SELECT 
        ${selectPeriod},
        COUNT(DISTINCT a.user_id) as unique_employees,
        COUNT(a.id) as total_records,
        AVG(a.total_hours) as avg_hours,
        SUM(a.total_hours) as total_hours,
        AVG(break_stats.break_time) as avg_break_time,
        COUNT(CASE WHEN a.total_hours >= 8 THEN 1 END) as full_days,
        (COUNT(CASE WHEN a.total_hours >= 8 THEN 1 END) * 100.0 / COUNT(a.id)) as full_day_percentage
      FROM attendance a
      LEFT JOIN (
        SELECT 
          a.id as attendance_id,
          COALESCE(SUM(b.break_duration), 0) as break_time
        FROM attendance a
        LEFT JOIN breaks b ON a.id = b.attendance_id AND b.break_end IS NOT NULL
        GROUP BY a.id
      ) break_stats ON a.id = break_stats.attendance_id
      WHERE a.date >= CURRENT_DATE - INTERVAL '90 days' AND a.total_hours IS NOT NULL
      GROUP BY ${groupBy}
      ORDER BY ${selectPeriod}
    `);

    // Calculate growth rates
    const trendWithGrowth = trendData.map((item, index) => {
      if (index === 0) {
        return { ...item, growth_rate: 0 };
      }
      
      const previousValue = trendData[index - 1][metric === 'hours' ? 'avg_hours' : 'unique_employees'];
      const currentValue = item[metric === 'hours' ? 'avg_hours' : 'unique_employees'];
      const growthRate = previousValue ? ((currentValue - previousValue) / previousValue * 100) : 0;
      
      return { ...item, growth_rate: Math.round(growthRate * 100) / 100 };
    });

    res.status(200).json({
      success: true,
      data: {
        trends: trendWithGrowth,
        period: period,
        metric: metric,
        summary: {
          total_periods: trendData.length,
          avg_growth_rate: trendWithGrowth.reduce((sum, item) => sum + (item.growth_rate || 0), 0) / trendWithGrowth.length
        }
      }
    });

  } catch (error) {
    console.error('Trend analysis error:', error);
    res.status(500).json({ error: 'Failed to perform trend analysis' });
  }
}

// Employee Statistics
async function getEmployeeStatistics(req, res) {
  const { employee_id } = req.query;
  
  if (!employee_id) {
    return res.status(400).json({ error: 'Employee ID required' });
  }

  try {
    // Employee basic info and stats
    const employeeInfo = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at as join_date,
        COUNT(a.id) as total_work_days,
        AVG(a.total_hours) as avg_daily_hours,
        SUM(a.total_hours) as total_hours_worked,
        MIN(a.date) as first_work_date,
        MAX(a.date) as last_work_date
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.total_hours IS NOT NULL
      WHERE u.id = ${employee_id}
      GROUP BY u.id, u.name, u.email, u.created_at
    `;

    if (employeeInfo.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Monthly performance
    const monthlyPerformance = await sql`
      SELECT 
        EXTRACT(YEAR FROM a.date) as year,
        EXTRACT(MONTH FROM a.date) as month,
        COUNT(a.id) as days_worked,
        AVG(a.total_hours) as avg_hours,
        SUM(a.total_hours) as total_hours,
        COUNT(CASE WHEN a.total_hours >= 8 THEN 1 END) as full_days
      FROM attendance a
      WHERE a.user_id = ${employee_id} AND a.total_hours IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM a.date), EXTRACT(MONTH FROM a.date)
      ORDER BY year DESC, month DESC
      LIMIT 12
    `;

    // Break analysis
    const breakAnalysis = await sql`
      SELECT 
        COUNT(b.id) as total_breaks,
        AVG(b.break_duration) as avg_break_duration,
        SUM(b.break_duration) as total_break_time,
        COUNT(CASE WHEN b.break_duration > 60 THEN 1 END) as long_breaks_count
      FROM breaks b
      INNER JOIN attendance a ON b.attendance_id = a.id
      WHERE a.user_id = ${employee_id} AND b.break_end IS NOT NULL
    `;

    // Recent activity
    const recentActivity = await sql`
      SELECT 
        a.date,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.status,
        a.notes,
        (SELECT COUNT(*) FROM breaks b WHERE b.attendance_id = a.id) as breaks_taken
      FROM attendance a
      WHERE a.user_id = ${employee_id}
      ORDER BY a.date DESC
      LIMIT 30
    `;

    // Performance comparison with team average
    const teamComparison = await sql`
      SELECT 
        AVG(a.total_hours) as team_avg_hours,
        AVG(break_stats.break_time) as team_avg_break_time
      FROM attendance a
      LEFT JOIN (
        SELECT 
          a.id as attendance_id,
          COALESCE(SUM(b.break_duration), 0) as break_time
        FROM attendance a
        LEFT JOIN breaks b ON a.id = b.attendance_id AND b.break_end IS NOT NULL
        GROUP BY a.id
      ) break_stats ON a.id = break_stats.attendance_id
      INNER JOIN users u ON a.user_id = u.id
      WHERE u.role = 'employee' AND a.total_hours IS NOT NULL
        AND a.date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    res.status(200).json({
      success: true,
      data: {
        employee_info: employeeInfo[0],
        monthly_performance: monthlyPerformance,
        break_analysis: breakAnalysis[0],
        recent_activity: recentActivity,
        team_comparison: teamComparison[0]
      }
    });

  } catch (error) {
    console.error('Employee statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch employee statistics' });
  }
}

// Custom Report Generation
async function generateCustomReport(req, res, decoded) {
  const { 
    date_range, 
    employees, 
    metrics, 
    format = 'json',
    report_name 
  } = req.body;

  try {
    // Build dynamic query based on requested metrics
    let selectFields = ['a.date', 'u.name as employee_name'];
    
    if (metrics.includes('check_times')) {
      selectFields.push('a.check_in', 'a.check_out');
    }
    
    if (metrics.includes('hours')) {
      selectFields.push('a.total_hours');
    }
    
    if (metrics.includes('breaks')) {
      selectFields.push('(SELECT COUNT(*) FROM breaks b WHERE b.attendance_id = a.id) as break_count');
      selectFields.push('(SELECT SUM(b.break_duration) FROM breaks b WHERE b.attendance_id = a.id AND b.break_end IS NOT NULL) as total_break_time');
    }
    
    if (metrics.includes('status')) {
      selectFields.push('a.status');
    }
    
    if (metrics.includes('notes')) {
      selectFields.push('a.notes');
    }

    // Build WHERE clause
    const conditions = ['1=1'];
    const params = [];

    if (date_range.start) {
      conditions.push(`a.date >= $${params.length + 1}`);
      params.push(date_range.start);
    }

    if (date_range.end) {
      conditions.push(`a.date <= $${params.length + 1}`);
      params.push(date_range.end);
    }

    if (employees && employees.length > 0) {
      conditions.push(`a.user_id = ANY($${params.length + 1})`);
      params.push(employees);
    }

    const queryText = `
      SELECT ${selectFields.join(', ')}
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.date DESC, u.name
    `;

    const reportData = await sql.unsafe(queryText, params);

    // Log report generation
    await sql`
      INSERT INTO audit_logs (admin_id, action, table_name, record_id, new_values, timestamp)
      VALUES (
        ${decoded.userId}, 
        'generate_custom_report', 
        'attendance', 
        NULL, 
        ${JSON.stringify({ report_name, date_range, employees, metrics })}, 
        CURRENT_TIMESTAMP
      )
    `;

    res.status(200).json({
      success: true,
      data: {
        report_name: report_name || 'Custom Report',
        generated_at: new Date().toISOString(),
        parameters: { date_range, employees, metrics },
        record_count: reportData.length,
        data: reportData
      }
    });

  } catch (error) {
    console.error('Custom report error:', error);
    res.status(500).json({ error: 'Failed to generate custom report' });
  }
} 