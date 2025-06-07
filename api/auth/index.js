import { getUserByEmail, getUserById } from '../utils/database.js';
import { comparePassword, generateToken, verifyAuthToken } from '../utils/auth.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    if (req.method === 'POST' && action === 'login') {
      // LOGIN FUNCTIONALITY
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Get user from database
      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });

      // Return user data and token
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } else if (req.method === 'GET' && action === 'verify') {
      // VERIFY FUNCTIONALITY
      // Verify JWT token
      const decoded = verifyAuthToken(req);
      
      // Get fresh user data from database
      const user = await getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Return user data
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed or invalid action' });
    }

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 