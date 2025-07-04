import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';
import { verifyToken } from '../utils/auth.js';

const sql = neon(process.env.NEON_DATABASE_URL);

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get user info to verify admin role
    const userResult = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`;
    if (userResult.length === 0 || userResult[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // Get all employees (excluding admins)
      const employees = await sql`
        SELECT id, email, name, role, created_at 
        FROM users 
        WHERE role = 'employee' 
        ORDER BY created_at DESC
      `;
      
      return res.status(200).json({ 
        success: true, 
        data: employees 
      });
    }

    if (req.method === 'POST') {
      // Create new employee account
      const { email, name, password } = req.body;

      if (!email || !name || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email, name, and password are required' 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email format' 
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password must be at least 6 characters long' 
        });
      }

      // Check if email already exists
      const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existingUser.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'Email already exists' 
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create employee account
      const result = await sql`
        INSERT INTO users (email, name, password, role) 
        VALUES (${email}, ${name}, ${hashedPassword}, 'employee') 
        RETURNING id, email, name, role, created_at
      `;

      return res.status(201).json({ 
        success: true, 
        data: result[0],
        message: 'Employee account created successfully' 
      });
    }

    if (req.method === 'DELETE') {
      // Delete employee account
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID is required' 
        });
      }

      // Verify the user exists and is an employee
      const userToDelete = await sql`SELECT role FROM users WHERE id = ${userId}`;
      if (userToDelete.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      if (userToDelete[0].role === 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Cannot delete admin users' 
        });
      }

      // Delete user (this will cascade delete attendance and breaks)
      await sql`DELETE FROM users WHERE id = ${userId}`;

      return res.status(200).json({ 
        success: true, 
        message: 'Employee account deleted successfully' 
      });
    }

    if (req.method === 'PATCH') {
      // Admin reset employee password (and/or name)
      const { userId, newPassword, name } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      // Verify the user exists and is an employee
      const userToUpdate = await sql`SELECT * FROM users WHERE id = ${userId}`;
      if (userToUpdate.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (userToUpdate[0].role === 'admin') {
        return res.status(403).json({ success: false, error: 'Cannot update admin users' });
      }
      if (!newPassword && !name) {
        return res.status(400).json({ success: false, error: 'No changes provided' });
      }
      const { updateUserById } = await import('../utils/database.js');
      const updated = await updateUserById(userId, { name, password: newPassword });
      return res.status(200).json({ success: true, user: updated });
    }

    // Method not allowed
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });

  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
} 