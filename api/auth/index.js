import { getUserByEmail, getUserById, updateUserById } from '../utils/database.js';
import { comparePassword, generateToken, verifyAuthToken } from '../utils/auth.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH');
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

    } else if (req.method === 'PATCH') {
      // UPDATE NAME/PASSWORD FUNCTIONALITY
      const decoded = verifyAuthToken(req);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or missing token' });
      }
      const user = await getUserById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { name, currentPassword, newPassword, confirmPassword } = req.body;
      let updateFields = {};
      // Name update
      if (name && name !== user.name) {
        updateFields.name = name;
      }
      // Password update
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          return res.status(400).json({ error: 'All password fields are required' });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        if (newPassword !== confirmPassword) {
          return res.status(400).json({ error: 'New passwords do not match' });
        }
        const isValid = await comparePassword(currentPassword, user.password);
        if (!isValid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
        updateFields.password = newPassword;
      }
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ error: 'No changes provided' });
      }
      // Update in DB
      const updated = await updateUserById(user.id, updateFields);
      return res.status(200).json({ success: true, user: updated });

    } else {
      return res.status(405).json({ error: 'Method not allowed or invalid action' });
    }

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 