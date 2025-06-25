import { neon } from '@neondatabase/serverless';
import { hashPassword } from './utils/auth.js';

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
    const results = [];

    // Create users table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'employee',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('Users table created/verified');
    } catch (e) {
      results.push(`Users table error: ${e.message}`);
    }

    // Create attendance table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          check_in TIMESTAMP,
          check_out TIMESTAMP,
          total_hours DECIMAL(4,2) DEFAULT 0,
          notes TEXT,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, date)
        )
      `;
      results.push('Attendance table created/verified');
    } catch (e) {
      results.push(`Attendance table error: ${e.message}`);
    }

    // Create breaks table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS breaks (
          id SERIAL PRIMARY KEY,
          attendance_id INTEGER NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
          break_start TIMESTAMP NOT NULL,
          break_end TIMESTAMP,
          break_duration NUMERIC(5,2),
          break_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('Breaks table created/verified');
    } catch (e) {
      results.push(`Breaks table error: ${e.message}`);
    }

    // Create system_settings table for super admin controls
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT NOT NULL,
          updated_by INTEGER REFERENCES users(id),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('System settings table created/verified');
    } catch (e) {
      results.push(`System settings table error: ${e.message}`);
    }

    // Create audit_logs table for tracking admin actions
    try {
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
      results.push('Audit logs table created/verified');
    } catch (e) {
      results.push(`Audit logs table error: ${e.message}`);
    }

    // Create work_policies table for employee-specific policies
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS work_policies (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          work_start TIME DEFAULT '09:00:00',
          work_end TIME DEFAULT '17:00:00',
          break_limit INTEGER DEFAULT 60,
          overtime_threshold NUMERIC(3,1) DEFAULT 8.0,
          weekend_work_allowed BOOLEAN DEFAULT FALSE,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('Work policies table created/verified');
    } catch (e) {
      results.push(`Work policies table error: ${e.message}`);
    }

    // Insert default system settings
    try {
      await sql`
        INSERT INTO system_settings (setting_key, setting_value, updated_by)
        VALUES 
          ('system_configuration_enabled', 'true', 1),
          ('work_start_time', '09:00', 1),
          ('work_end_time', '17:00', 1),
          ('break_duration_limit', '60', 1),
          ('overtime_threshold', '8', 1),
          ('auto_checkout_time', '18:00', 1),
          ('weekend_work_allowed', 'false', 1),
          ('break_reminders_enabled', 'true', 1),
          ('auto_refresh_interval', '30', 1)
        ON CONFLICT (setting_key) DO NOTHING
      `;
      results.push('Default system settings inserted');
    } catch (e) {
      results.push(`Default system settings insertion error: ${e.message}`);
    }

    // Create indexes for better performance
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date)`;
      results.push('Attendance user_id, date index created');
    } catch (e) {
      results.push(`Attendance user_id, date index error: ${e.message}`);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`;
      results.push('Attendance date index created');
    } catch (e) {
      results.push(`Attendance date index error: ${e.message}`);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_breaks_attendance ON breaks(attendance_id)`;
      results.push('Breaks attendance index created');
    } catch (e) {
      results.push(`Breaks attendance index error: ${e.message}`);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id)`;
      results.push('Audit logs admin index created');
    } catch (e) {
      results.push(`Audit logs admin index error: ${e.message}`);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`;
      results.push('Audit logs timestamp index created');
    } catch (e) {
      results.push(`Audit logs timestamp index error: ${e.message}`);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_work_policies_employee ON work_policies(employee_id)`;
      results.push('Work policies employee index created');
    } catch (e) {
      results.push(`Work policies employee index error: ${e.message}`);
    }

    // Add updated_at column to attendance table if it doesn't exist
    try {
      await sql`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`;
      results.push('updated_at column added to attendance table');
    } catch (error) {
      // Column might already exist
      results.push('updated_at column handling:', error.message);
    }

    // Check if admin user exists
    const existingAdmin = await sql`SELECT id FROM users WHERE email = 'admin@bichitras.com'`;
    
    if (existingAdmin.length === 0) {
      // Create admin user with hashed password
      const hashedPassword = await hashPassword('sandeshisdone');
      
      await sql`
        INSERT INTO users (email, name, password, role) 
        VALUES ('admin@bichitras.com', 'Admin User', ${hashedPassword}, 'admin')
      `;
      
      results.push('Admin user created successfully');
    } else {
      results.push('Admin user already exists');
    }

    res.status(200).json({
      success: true,
      message: 'Database setup completed',
      results: results,
      adminCredentials: {
        email: 'admin@bichitras.com',
        password: 'sandeshisdon'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ 
      error: 'Database setup failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 