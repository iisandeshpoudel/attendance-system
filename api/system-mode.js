import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.NEON_DATABASE_URL);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token (both admin and employee can access this)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get system configuration mode
    const settings = await sql`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key = 'system_configuration_enabled'
    `;

    const configEnabled = settings.length > 0 
      ? settings[0].setting_value === 'true' 
      : true; // Default to configured mode if no setting exists

    res.status(200).json({
      success: true,
      data: {
        mode: configEnabled ? 'configured' : 'flexible',
        system_configuration_enabled: configEnabled
      }
    });

  } catch (error) {
    console.error('System mode check error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to check system mode' });
  }
} 