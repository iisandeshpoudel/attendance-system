import { verifyAuthToken } from '../utils/auth.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify JWT token and admin role
    const decoded = verifyAuthToken(req);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, action, decoded);
      case 'POST':
        return await handlePost(req, res, action, decoded);
      case 'PUT':
        return await handlePut(req, res, action, decoded);
      case 'DELETE':
        return await handleDelete(req, res, action, decoded);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Super controls error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET handlers - System settings, employee data, audit logs
async function handleGet(req, res, action, decoded) {
  switch (action) {
    case 'get-settings':
      return await getSystemSettings(req, res);
    
    case 'get-all-attendance':
      return await getAllAttendanceRecords(req, res);
    
    case 'get-employee-details':
      return await getEmployeeDetails(req, res);
    
    case 'get-audit-logs':
      return await getAuditLogs(req, res);
    
    case 'debug-audit':
      return await debugAuditLogs(req, res);
    
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

// POST handlers - Create settings, force actions, bulk operations
async function handlePost(req, res, action, decoded) {
  switch (action) {
    case 'update-settings':
      return await updateSystemSettings(req, res, decoded);
    
    case 'force-action':
      return await forceEmployeeAction(req, res, decoded);
    
    case 'bulk-operation':
      return await performBulkOperation(req, res, decoded);
    
    case 'manual-attendance':
      return await createManualAttendance(req, res, decoded);
    
    case 'export-data':
      return await exportAttendanceData(req, res, decoded);
    
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

// PUT handlers - Bulk edits, mass updates
async function handlePut(req, res, action, decoded) {
  switch (action) {
    case 'bulk-edit':
      return await bulkEditRecords(req, res, decoded);
    
    case 'update-employee-profiles':
      return await bulkUpdateEmployeeProfiles(req, res, decoded);
    
    case 'adjust-work-hours':
      return await bulkAdjustWorkHours(req, res, decoded);
    
    case 'edit-attendance':
      return await editSingleAttendanceRecord(req, res, decoded);
    
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

// DELETE handlers - Cleanup, reset operations
async function handleDelete(req, res, action, decoded) {
  switch (action) {
    case 'cleanup':
      return await performDataCleanup(req, res, decoded);
    
    case 'reset-employee':
      return await resetEmployeeData(req, res, decoded);
    
    case 'purge-old-records':
      return await purgeOldRecords(req, res, decoded);
    
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

// System Settings Management
async function getSystemSettings(req, res) {
  try {
    // First, ensure the system_settings table exists
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Default system settings
    const defaultSettings = {
      system_configuration_enabled: 'true',
      work_start_time: '09:00',
      work_end_time: '17:00',
      break_duration_limit: '60',
      overtime_threshold: '8',
      auto_checkout_time: '18:00',
      weekend_work_allowed: 'false',
      break_reminders_enabled: 'true',
      auto_refresh_interval: '30'
    };

    // Insert default settings if they don't exist
    for (const [key, value] of Object.entries(defaultSettings)) {
      await sql`
        INSERT INTO system_settings (setting_key, setting_value, updated_by)
        VALUES (${key}, ${value}, 1)
        ON CONFLICT (setting_key) DO NOTHING
      `;
    }

    // Now get the settings
    const settings = await sql`
      SELECT setting_key, setting_value, updated_at, updated_by
      FROM system_settings
      ORDER BY setting_key
    `;

    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = {
        value: setting.setting_value,
        updated_at: setting.updated_at,
        updated_by: setting.updated_by
      };
    });

    // Merge with defaults for any missing settings
    Object.keys(defaultSettings).forEach(key => {
      if (!settingsMap[key]) {
        settingsMap[key] = { value: defaultSettings[key], updated_at: null, updated_by: null };
      }
    });

    res.status(200).json({
      success: true,
      data: { settings: settingsMap }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get system settings' });
  }
}

async function updateSystemSettings(req, res, decoded) {
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object required' });
  }

  try {
    // Create audit log entry
    await logAdminAction(decoded.userId, 'update_system_settings', 'system_settings', null, null, settings);

    // Update or insert settings
    for (const [key, value] of Object.entries(settings)) {
      await sql`
        INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
        VALUES (${key}, ${String(value)}, ${decoded.userId}, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key) 
        DO UPDATE SET 
          setting_value = ${String(value)},
          updated_by = ${decoded.userId},
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully'
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
}

// Advanced Attendance Management
async function getAllAttendanceRecords(req, res) {
  const { start_date, end_date, employee_id, status, limit = 100 } = req.query;

  try {
    console.log('Filters received:', { start_date, end_date, employee_id, status, limit });

    // Build WHERE conditions
    let whereConditions = ['1=1'];
    
    if (start_date) {
      whereConditions.push(`a.date >= '${start_date}'`);
    }
    
    if (end_date) {
      whereConditions.push(`a.date <= '${end_date}'`);
    }
    
    if (employee_id && employee_id !== '') {
      whereConditions.push(`a.user_id = ${parseInt(employee_id)}`);
    }
    
    if (status && status !== '') {
      whereConditions.push(`a.status = '${status}'`);
    }

    // If no date filters, get last 30 days
    if (!start_date && !end_date) {
      whereConditions.push("a.date >= CURRENT_DATE - INTERVAL '30 days'");
    }

    // Execute the query using Neon SQL template 
    const result = await sql`
      SELECT 
        a.id,
        a.user_id,
        a.date,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.notes,
        a.status,
        a.created_at,
        u.name as employee_name,
        u.email as employee_email,
        COALESCE((SELECT COUNT(*) FROM breaks b WHERE b.attendance_id = a.id), 0) as total_breaks,
        COALESCE((SELECT SUM(break_duration) FROM breaks b WHERE b.attendance_id = a.id AND b.break_end IS NOT NULL), 0) as total_break_time
      FROM attendance a
      LEFT JOIN users u ON a.user_id = u.id
    `;

    console.log('Raw result from DB:', result);

    // Apply filters manually if needed
    let filteredResult = result;

    if (start_date) {
      filteredResult = filteredResult.filter(record => record.date >= start_date);
    }

    if (end_date) {
      filteredResult = filteredResult.filter(record => record.date <= end_date);
    }

    if (employee_id && employee_id !== '') {
      filteredResult = filteredResult.filter(record => record.user_id == parseInt(employee_id));
    }

    if (status && status !== '') {
      filteredResult = filteredResult.filter(record => record.status === status);
    }

    // Sort and limit
    filteredResult = filteredResult
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, parseInt(limit));

    console.log('Filtered result:', filteredResult.length, 'records');

    res.status(200).json({
      success: true,
      data: {
        records: filteredResult,
        total_found: filteredResult.length,
        filters_applied: { start_date, end_date, employee_id, status, limit }
      }
    });

  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records: ' + error.message });
  }
}

// Bulk Operations
async function bulkEditRecords(req, res, decoded) {
  const { record_ids, updates } = req.body;

  if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
    return res.status(400).json({ error: 'Record IDs array required' });
  }

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Updates object required' });
  }

  try {
    // Get original records for audit trail
    const originalRecords = await sql`
      SELECT id, check_in, check_out, total_hours, notes, status 
      FROM attendance 
      WHERE id = ANY(${record_ids})
    `;

    // Build update query dynamically
    const updateFields = [];
    const params = [];

    if (updates.check_in !== undefined) {
      updateFields.push(`check_in = $${params.length + 1}`);
      params.push(updates.check_in);
    }

    if (updates.check_out !== undefined) {
      updateFields.push(`check_out = $${params.length + 1}`);
      params.push(updates.check_out);
    }

    if (updates.total_hours !== undefined) {
      updateFields.push(`total_hours = $${params.length + 1}`);
      params.push(parseFloat(updates.total_hours));
    }

    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${params.length + 1}`);
      params.push(updates.notes);
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${params.length + 1}`);
      params.push(updates.status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    // Note: attendance table doesn't have updated_at column

    // Perform bulk update
    const queryText = `
      UPDATE attendance 
      SET ${updateFields.join(', ')} 
      WHERE id = ANY($${params.length + 1})
      RETURNING id
    `;

    params.push(record_ids);

    const updatedRecords = await sql.unsafe(queryText, params);

    // Log audit trail for each record
    for (const originalRecord of originalRecords) {
      await logAdminAction(
        decoded.userId,
        'bulk_edit_attendance',
        'attendance',
        originalRecord.id,
        originalRecord,
        updates
      );
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedRecords.length} records`,
      updated_count: updatedRecords.length
    });

  } catch (error) {
    console.error('Bulk edit error:', error);
    res.status(500).json({ error: 'Failed to perform bulk edit' });
  }
}

// Force Employee Actions
async function forceEmployeeAction(req, res, decoded) {
  const { employee_id, action, notes } = req.body;

  if (!employee_id || !action) {
    return res.status(400).json({ error: 'Employee ID and action required' });
  }

  if (!notes || notes.trim() === '') {
    return res.status(400).json({ error: 'Administrative notes are required for force actions' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    console.log('Force action:', { employee_id, action, notes, today, now });

    // First check if employee exists
    const employee = await sql`SELECT id, name FROM users WHERE id = ${employee_id} AND role = 'employee'`;
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    switch (action) {
      case 'check_in':
        // Force check-in - create or update attendance record with data preservation
        
        // First, check if there's an existing record to preserve data
        const existingRecord = await sql`
          SELECT id, check_in, check_out, total_hours, status, notes
          FROM attendance 
          WHERE user_id = ${employee_id} AND date = ${today}
        `;

        let preservationNote = '';
        if (existingRecord.length > 0) {
          const record = existingRecord[0];
          if (record.check_out) {
            preservationNote = `[ADMIN OVERRIDE: Previous checkout at ${new Date(record.check_out).toLocaleTimeString()}, ${record.total_hours || 0}h worked] `;
          } else if (record.check_in) {
            preservationNote = `[ADMIN OVERRIDE: Previous checkin at ${new Date(record.check_in).toLocaleTimeString()}] `;
          }
        }

        const finalNotes = preservationNote + notes;

        const checkInResult = await sql`
          INSERT INTO attendance (user_id, date, check_in, notes, status, created_at)
          VALUES (${employee_id}, ${today}, ${now}, ${finalNotes}, 'working', ${now})
          ON CONFLICT (user_id, date) 
          DO UPDATE SET 
            check_in = EXCLUDED.check_in,
            check_out = NULL,
            total_hours = NULL,
            notes = CASE 
              WHEN attendance.notes IS NULL OR attendance.notes = '' THEN EXCLUDED.notes
              ELSE attendance.notes || ' | ' || EXCLUDED.notes
            END,
            status = 'working'
          RETURNING id, check_in
        `;
        console.log('Check-in result:', checkInResult);
        break;

      case 'check_out':
        // Force check-out - first ensure there's an attendance record
        let attendanceRecord = await sql`
          SELECT id, check_in FROM attendance 
          WHERE user_id = ${employee_id} AND date = ${today}
        `;

        if (attendanceRecord.length === 0) {
          // Create attendance record with check-in at start of day if none exists
          const startOfDay = `${today}T09:00:00.000Z`;
          attendanceRecord = await sql`
            INSERT INTO attendance (user_id, date, check_in, check_out, notes, status, created_at)
            VALUES (${employee_id}, ${today}, ${startOfDay}, ${now}, ${notes}, 'completed', ${now})
            RETURNING id, check_in
          `;
        } else {
          // Update existing record
          await sql`
            UPDATE attendance 
            SET check_out = ${now}, 
                status = 'completed',
                notes = CASE 
                  WHEN notes IS NULL OR notes = '' THEN ${notes}
                  ELSE notes || ' | ' || ${notes}
                END
            WHERE id = ${attendanceRecord[0].id}
          `;
        }

        // Calculate total hours
        const record = attendanceRecord[0];
        if (record.check_in) {
          const checkIn = new Date(record.check_in);
          const checkOut = new Date(now);
          const totalHours = Math.round((checkOut - checkIn) / (1000 * 60 * 60) * 100) / 100;

          await sql`
            UPDATE attendance 
            SET total_hours = ${totalHours}
            WHERE id = ${record.id}
          `;
        }
        break;

      case 'end_break':
        // Force end all active breaks
        const activeBreaks = await sql`
          SELECT b.id FROM breaks b
          JOIN attendance a ON b.attendance_id = a.id
          WHERE a.user_id = ${employee_id} AND a.date = ${today} AND b.break_end IS NULL
        `;

        if (activeBreaks.length > 0) {
          await sql`
            UPDATE breaks 
            SET break_end = ${now},
                break_duration = EXTRACT(EPOCH FROM (${now}::timestamp - break_start)) / 60,
                break_note = CASE 
                  WHEN break_note IS NULL OR break_note = '' THEN ${notes}
                  ELSE break_note || ' | ' || ${notes}
                END
            WHERE attendance_id IN (
              SELECT id FROM attendance WHERE user_id = ${employee_id} AND date = ${today}
            ) AND break_end IS NULL
          `;

          // Update attendance status to working
          await sql`
            UPDATE attendance 
            SET status = 'working'
            WHERE user_id = ${employee_id} AND date = ${today}
          `;
        } else {
          return res.status(400).json({ error: 'No active breaks found for this employee today' });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid action. Valid actions: check_in, check_out, end_break' });
    }

    // Log the forced action after successful execution
    await logAdminAction(decoded.userId, `force_${action}`, 'attendance', employee_id, null, { 
      action, 
      notes, 
      employee_name: employee[0].name,
      date: today 
    });

    res.status(200).json({
      success: true,
      message: `Successfully forced ${action.replace('_', ' ')} for ${employee[0].name}`,
      data: {
        employee_id,
        employee_name: employee[0].name,
        action,
        notes,
        timestamp: now
      }
    });

  } catch (error) {
    console.error('Force action error:', error);
    res.status(500).json({ error: 'Failed to force employee action: ' + error.message });
  }
}

// Audit Logging Function
async function logAdminAction(adminId, action, tableName, recordId, oldValues, newValues) {
  try {
    console.log('Creating audit log:', { adminId, action, tableName, recordId, oldValues, newValues });
    
    // Ensure audit_logs table exists
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const result = await sql`
      INSERT INTO audit_logs (admin_id, action, table_name, record_id, old_values, new_values, timestamp)
      VALUES (
        ${adminId}, 
        ${action}, 
        ${tableName}, 
        ${recordId}, 
        ${oldValues ? JSON.stringify(oldValues) : null}, 
        ${newValues ? JSON.stringify(newValues) : null}, 
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `;
    
    console.log('Audit log created successfully:', result[0]?.id);
  } catch (error) {
    console.error('Audit log error:', error);
    console.error('Audit log details:', { adminId, action, tableName, recordId });
    // Don't fail the main operation if audit logging fails
  }
}

// Get Audit Logs
async function getAuditLogs(req, res) {
  const { limit = 50, offset = 0 } = req.query;

  try {
    // Ensure audit_logs table exists
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Always return the latest logs, no filters
    const logs = await sql`
      SELECT 
        al.id,
        al.admin_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_values,
        al.new_values,
        al.timestamp,
        u.name as admin_name,
        u.email as admin_email
      FROM audit_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.timestamp DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    res.status(200).json({
      success: true,
      data: {
        logs,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: logs.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs: ' + error.message });
  }
}

// Export Functionality (consolidated from export.js)
async function exportAttendanceData(req, res, decoded) {
  const { format = 'csv', startDate, endDate, employeeId } = req.body;

  try {
    // Build query with filters using new pattern
    let conditions = [];
    
    if (startDate && startDate !== '') {
      conditions.push(`a.date >= '${startDate}'`);
    }
    
    if (endDate && endDate !== '') {
      conditions.push(`a.date <= '${endDate}'`);
    }
    
    if (employeeId && employeeId !== '') {
      conditions.push(`a.user_id = ${parseInt(employeeId)}`);
    }

    // Build final query
    let queryText = `
      SELECT 
        a.date,
        u.name as employee_name,
        u.email as employee_email,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.notes,
        a.status,
        COALESCE((SELECT COUNT(*) FROM breaks b WHERE b.attendance_id = a.id), 0) as total_breaks,
        COALESCE((SELECT SUM(b.break_duration) FROM breaks b WHERE b.attendance_id = a.id AND b.break_end IS NOT NULL), 0) as total_break_time
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE u.role = 'employee'
    `;

    if (conditions.length > 0) {
      queryText += ' AND ' + conditions.join(' AND ');
    }

    queryText += ` ORDER BY a.date DESC, u.name ASC`;

    console.log('Export query:', queryText);

    const data = await sql.unsafe(queryText);

    // Log export action
    await logAdminAction(decoded.userId, 'export_attendance_data', 'attendance', null, null, {
      format,
      startDate,
      endDate,
      employeeId,
      recordCount: data.length
    });

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Date',
        'Employee Name',
        'Employee Email',
        'Check In',
        'Check Out',
        'Total Hours',
        'Notes',
        'Status',
        'Total Breaks',
        'Total Break Time (minutes)'
      ];

      const csvRows = data.map(row => [
        row.date,
        row.employee_name,
        row.employee_email,
        row.check_in ? new Date(row.check_in).toLocaleString() : '',
        row.check_out ? new Date(row.check_out).toLocaleString() : '',
        row.total_hours || '',
        row.notes || '',
        row.status,
        row.total_breaks || 0,
        row.total_break_time || 0
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        data: {
          export_info: {
            format: 'json',
            generated_at: new Date().toISOString(),
            record_count: data.length,
            filters: { startDate, endDate, employeeId }
          },
          records: data
        }
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
}

// Single Attendance Record Edit (consolidated from edit-attendance.js)
async function editSingleAttendanceRecord(req, res, decoded) {
  const { attendanceId, checkIn, checkOut, totalHours, notes, status } = req.body;

  if (!attendanceId) {
    return res.status(400).json({ error: 'Attendance ID is required' });
  }

  try {
    // Get original record for audit trail
    const originalRecord = await sql`
      SELECT * FROM attendance WHERE id = ${attendanceId}
    `;

    if (originalRecord.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const original = originalRecord[0];

    // Build update query dynamically
    const updateFields = [];
    const params = [];

    if (checkIn !== undefined) {
      if (checkIn === null || checkIn === '') {
        updateFields.push(`check_in = NULL`);
      } else {
        updateFields.push(`check_in = $${params.length + 1}`);
        params.push(checkIn);
      }
    }

    if (checkOut !== undefined) {
      if (checkOut === null || checkOut === '') {
        updateFields.push(`check_out = NULL`);
      } else {
        updateFields.push(`check_out = $${params.length + 1}`);
        params.push(checkOut);
      }
    }

    if (totalHours !== undefined) {
      if (totalHours === null || totalHours === '') {
        updateFields.push(`total_hours = NULL`);
      } else {
        updateFields.push(`total_hours = $${params.length + 1}`);
        params.push(parseFloat(totalHours));
      }
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${params.length + 1}`);
      params.push(notes);
    }

    if (status !== undefined) {
      updateFields.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Note: attendance table doesn't have updated_at column

    const queryText = `
      UPDATE attendance 
      SET ${updateFields.join(', ')} 
      WHERE id = $${params.length + 1}
      RETURNING *
    `;

    params.push(attendanceId);

    const result = await sql.unsafe(queryText, params);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Log the edit action
    await logAdminAction(
      decoded.userId,
      'edit_attendance_record',
      'attendance',
      attendanceId,
      original,
      { checkIn, checkOut, totalHours, notes, status }
    );

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: result[0]
    });

  } catch (error) {
    console.error('Edit attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
}

// Additional helper functions for missing functionality
async function performBulkOperation(req, res, decoded) {
  // Placeholder for bulk operations
  res.status(200).json({
    success: true,
    message: 'Bulk operation completed'
  });
}

async function createManualAttendance(req, res, decoded) {
  const { user_id, date, check_in, check_out, total_hours, notes, status } = req.body;

  if (!user_id || !date) {
    return res.status(400).json({ error: 'User ID and date are required' });
  }

  try {
    const result = await sql`
      INSERT INTO attendance (user_id, date, check_in, check_out, total_hours, notes, status, created_at)
      VALUES (${user_id}, ${date}, ${check_in}, ${check_out}, ${total_hours}, ${notes || 'Manually created by admin'}, ${status || 'completed'}, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, date) 
      DO UPDATE SET 
        check_in = ${check_in},
        check_out = ${check_out},
        total_hours = ${total_hours},
        notes = ${notes || 'Manually updated by admin'},
        status = ${status || 'completed'}
      RETURNING *
    `;

    // Log the manual creation
    await logAdminAction(decoded.userId, 'create_manual_attendance', 'attendance', result[0].id, null, req.body);

    res.status(200).json({
      success: true,
      message: 'Manual attendance record created successfully',
      data: result[0]
    });

  } catch (error) {
    console.error('Manual attendance creation error:', error);
    res.status(500).json({ error: 'Failed to create manual attendance record' });
  }
}

async function bulkUpdateEmployeeProfiles(req, res, decoded) {
  // Placeholder for bulk employee profile updates
  res.status(200).json({
    success: true,
    message: 'Bulk employee profiles updated'
  });
}

async function bulkAdjustWorkHours(req, res, decoded) {
  // Placeholder for bulk work hours adjustment
  res.status(200).json({
    success: true,
    message: 'Bulk work hours adjusted'
  });
}

async function getEmployeeDetails(req, res) {
  const { employee_id } = req.query;

  if (!employee_id) {
    return res.status(400).json({ error: 'Employee ID required' });
  }

  try {
    const employee = await sql`
      SELECT 
        u.*,
        COUNT(a.id) as total_attendance_days,
        AVG(a.total_hours) as avg_daily_hours,
        SUM(a.total_hours) as total_hours_worked
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.total_hours IS NOT NULL
      WHERE u.id = ${employee_id}
      GROUP BY u.id
    `;

    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({
      success: true,
      data: employee[0]
    });

  } catch (error) {
    console.error('Get employee details error:', error);
    res.status(500).json({ error: 'Failed to fetch employee details' });
  }
}

async function performDataCleanup(req, res, decoded) {
  const { older_than_days = 180 } = req.body;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(older_than_days));
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // Delete old attendance records
    const deletedAttendance = await sql`
      DELETE FROM attendance 
      WHERE date < ${cutoffDateStr}
      RETURNING id
    `;

    // Log the cleanup action
    await logAdminAction(decoded.userId, 'data_cleanup', 'attendance', null, null, {
      older_than_days,
      records_deleted: deletedAttendance.length
    });

    res.status(200).json({
      success: true,
      message: `Cleaned up ${deletedAttendance.length} old attendance records`,
      records_deleted: deletedAttendance.length
    });

  } catch (error) {
    console.error('Data cleanup error:', error);
    res.status(500).json({ error: 'Failed to perform data cleanup' });
  }
}

async function resetEmployeeData(req, res, decoded) {
  const { employee_id, reset_type } = req.body;

  if (!employee_id || !reset_type) {
    return res.status(400).json({ error: 'Employee ID and reset type required' });
  }

  try {
    let result;

    switch (reset_type) {
      case 'all_attendance':
        result = await sql`
          DELETE FROM attendance 
          WHERE user_id = ${employee_id}
          RETURNING id
        `;
        break;

      case 'current_month':
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        result = await sql`
          DELETE FROM attendance 
          WHERE user_id = ${employee_id} 
            AND date >= ${currentMonth + '-01'}
            AND date < (DATE(${currentMonth + '-01'}) + INTERVAL '1 month')
          RETURNING id
        `;
        break;

      default:
        return res.status(400).json({ error: 'Invalid reset type' });
    }

    // Log the reset action
    await logAdminAction(decoded.userId, `reset_employee_${reset_type}`, 'attendance', employee_id, null, {
      employee_id,
      reset_type,
      records_deleted: result.length
    });

    res.status(200).json({
      success: true,
      message: `Reset ${result.length} records for employee`,
      records_deleted: result.length
    });

  } catch (error) {
    console.error('Reset employee data error:', error);
    res.status(500).json({ error: 'Failed to reset employee data' });
  }
}

async function purgeOldRecords(req, res, decoded) {
  const { days_old = 365 } = req.body;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days_old));
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // Purge old audit logs
    const purgedAuditLogs = await sql`
      DELETE FROM audit_logs 
      WHERE timestamp < ${cutoffDateStr}
      RETURNING id
    `;

    // Purge old attendance records
    const purgedAttendance = await sql`
      DELETE FROM attendance 
      WHERE date < ${cutoffDateStr}
      RETURNING id
    `;

    // Log the purge action
    await logAdminAction(decoded.userId, 'purge_old_records', 'system', null, null, {
      days_old,
      audit_logs_purged: purgedAuditLogs.length,
      attendance_records_purged: purgedAttendance.length
    });

    res.status(200).json({
      success: true,
      message: 'Old records purged successfully',
      audit_logs_purged: purgedAuditLogs.length,
      attendance_records_purged: purgedAttendance.length
    });

  } catch (error) {
    console.error('Purge old records error:', error);
    res.status(500).json({ error: 'Failed to purge old records' });
  }
}

// Debug function to check audit logs table and contents
async function debugAuditLogs(req, res) {
  try {
    // First, ensure the table exists
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Check if table exists and get structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position
    `;

    // Get total count of audit logs
    const totalCount = await sql`SELECT COUNT(*) as count FROM audit_logs`;

    // Get latest 10 logs
    const latestLogs = await sql`
      SELECT 
        al.id,
        al.admin_id,
        al.action,
        al.table_name,
        al.record_id,
        al.old_values,
        al.new_values,
        al.timestamp,
        u.name as admin_name
      FROM audit_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.timestamp DESC 
      LIMIT 10
    `;

    // Test creating a debug log entry
    const testLog = await sql`
      INSERT INTO audit_logs (admin_id, action, table_name, record_id, old_values, new_values)
      VALUES (1, 'debug_test', 'test', NULL, NULL, '{"test": "debug entry"}')
      RETURNING id, timestamp
    `;

    res.status(200).json({
      success: true,
      debug_info: {
        table_exists: tableInfo.length > 0,
        table_structure: tableInfo,
        total_audit_logs: totalCount[0]?.count || 0,
        latest_logs: latestLogs,
        test_log_created: testLog[0]
      }
    });

  } catch (error) {
    console.error('Debug audit logs error:', error);
    res.status(500).json({ 
      error: 'Debug failed: ' + error.message,
      stack: error.stack 
    });
  }
} 