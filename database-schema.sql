-- Complete Database Schema for Attendance System
-- Run this in your Neon DB console

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
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
);

-- Breaks table
CREATE TABLE IF NOT EXISTS breaks (
  id SERIAL PRIMARY KEY,
  attendance_id INTEGER REFERENCES attendance(id) ON DELETE CASCADE,
  break_start TIMESTAMP NOT NULL,
  break_end TIMESTAMP,
  break_duration INTEGER DEFAULT 0,
  break_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, name, password, role) VALUES 
('admin@company.com', 'Admin User', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeS.8QqjUXwQCNuE6', 'admin')
ON CONFLICT (email) DO NOTHING; 