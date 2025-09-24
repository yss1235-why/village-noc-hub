import { neon } from '@neondatabase/serverless';
import { requireSuperAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const authResult = requireSuperAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    // Get all pending users
    const pendingUsers = await sql`
      SELECT 
        id, full_name, username, email, phone, center_shop_name,
        aadhaar_number, address, created_at, is_approved
      FROM users 
      WHERE role = 'applicant' AND is_approved = false
      ORDER BY created_at DESC
    `;

    // Get approved users count for stats
    const approvedCount = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'applicant' AND is_approved = true
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pendingUsers: pendingUsers.map(user => ({
          id: user.id,
          fullName: user.full_name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          centerShopName: user.center_shop_name,
          aadhaarNumber: user.aadhaar_number.replace(/(\d{4})\d{4}(\d{4})/, '$1****$2'), // Mask middle digits
          address: user.address,
          registeredAt: user.created_at,
          status: 'pending'
        })),
        stats: {
          pendingCount: pendingUsers.length,
          approvedCount: approvedCount[0].count
        }
      })
    };

  } catch (error) {
    console.error('Get pending users error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get pending users' })
    };
  }
};
