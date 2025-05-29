import { query } from './utils/database.js';
import { hashPassword } from './utils/auth.js';

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
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'employee',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('Users table created/verified');
    } catch (e) {
      results.push(`Users table error: ${e.message}`);
    }

    // Create attendance table
    try {
      await query(`
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
      `);
      results.push('Attendance table created/verified');
    } catch (e) {
      results.push(`Attendance table error: ${e.message}`);
    }

    // Create breaks table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS breaks (
          id SERIAL PRIMARY KEY,
          attendance_id INTEGER REFERENCES attendance(id) ON DELETE CASCADE,
          break_start TIMESTAMP NOT NULL,
          break_end TIMESTAMP,
          break_duration INTEGER DEFAULT 0,
          break_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.push('Breaks table created/verified');
    } catch (e) {
      results.push(`Breaks table error: ${e.message}`);
    }

    // Check if admin user exists
    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', ['admin@company.com']);
    
    if (existingAdmin.length === 0) {
      // Create admin user with hashed password
      const hashedPassword = await hashPassword('admin123');
      
      await query(`
        INSERT INTO users (email, name, password, role) 
        VALUES ($1, $2, $3, $4)
      `, ['admin@company.com', 'Admin User', hashedPassword, 'admin']);
      
      results.push('Admin user created successfully');
    } else {
      results.push('Admin user already exists');
    }

    res.status(200).json({
      success: true,
      message: 'Database setup completed',
      results: results,
      adminCredentials: {
        email: 'admin@company.com',
        password: 'admin123'
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