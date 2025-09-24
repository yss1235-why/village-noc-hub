import { neon } from '@neondatabase/serverless';
import { requireSystemAdmin } from './utils/auth-middleware.js';

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

  const authResult = requireSystemAdmin(event);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  try {
    // Get users across all villages with detailed information
    const users = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.is_approved,
        u.is_active,
        u.point_balance,
        u.created_at,
        u.last_login,
        v.name as village_name,
        v.district,
        v.state,
        COUNT(DISTINCT a.id) as application_count,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as approved_applications,
        COALESCE(pt.total_points_earned, 0) as total_points_earned,
        COALESCE(pt.total_points_spent, 0) as total_points_spent
      FROM users u
      LEFT JOIN villages v ON u.village_id = v.id
      LEFT JOIN applications a ON u.id = a.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as total_points_earned,
          SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as total_points_spent
        FROM point_transactions
        GROUP BY user_id
      ) pt ON u.id = pt.user_id
      WHERE u.role IN ('user', 'applicant', 'village_admin')
      GROUP BY u.id, u.name, u.email, u.role, u.is_approved, u.is_active, u.point_balance, 
               u.created_at, u.last_login, v.name, v.district, v.state, 
               pt.total_points_earned, pt.total_points_spent
      ORDER BY u.created_at DESC
      LIMIT 1000
    `;

    // Get user statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN u.is_approved = true THEN 1 END) as approved_users,
        COUNT(CASE WHEN u.is_approved = false THEN 1 END) as pending_users,
        COUNT(CASE WHEN u.role = 'village_admin' THEN 1 END) as village_admins,
        COUNT(CASE WHEN u.role = 'user' OR u.role = 'applicant' THEN 1 END) as regular_users,
        COUNT(CASE WHEN u.last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users
      FROM users u
      WHERE u.role IN ('user', 'applicant', 'village_admin')
    `;

    // Log the access for audit purposes
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'VIEW_USERS', 'users',
        ${JSON.stringify({ 
          userCount: users.length,
          stats: stats[0]
        })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: users,
        statistics: stats[0],
        totalCount: users.length
      })
    };

  } catch (error) {
    console.error('Get system admin users error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve users data' })
    };
  }
};
