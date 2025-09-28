import { neon } from '@neondatabase/serverless';
import { requireMinimumRole } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  const authResult = requireMinimumRole(event, 'system_admin');
  if (!authResult.isValid) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Insufficient permissions' })
    };
  }

  try {
    const { q: searchTerm } = event.queryStringParameters || {};
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search term must be at least 2 characters' })
      };
    }

    const searchPattern = `%${searchTerm.trim().toLowerCase()}%`;

    const users = await sql`
      SELECT 
        u.id, u.username, u.email, u.full_name, u.role, u.point_balance,
        COALESCE(dr.total_recharged, 0) as daily_recharged,
        (1000 - COALESCE(dr.total_recharged, 0)) as remaining_daily_limit
      FROM users u
      LEFT JOIN daily_recharge_limits dr ON u.id = dr.user_id AND dr.recharge_date = CURRENT_DATE
      WHERE u.is_approved = true 
      AND u.role IN ('user', 'applicant')
      AND (
        LOWER(u.username) LIKE ${searchPattern} OR
        LOWER(u.email) LIKE ${searchPattern} OR
        LOWER(u.full_name) LIKE ${searchPattern}
      )
      ORDER BY u.username
      LIMIT 20
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          pointBalance: user.point_balance || 0,
          dailyRecharged: user.daily_recharged,
          remainingDailyLimit: user.remaining_daily_limit
        }))
      })
    };

  } catch (error) {
    console.error('User search error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to search users' })
    };
  }
};
