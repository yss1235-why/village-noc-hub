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
   // Get users - start simple like working applications function
   const users = await sql`
      SELECT 
        id,
        email,
        role,
        is_approved,
        created_at,
        COALESCE(full_name, 'N/A') as name,
        COALESCE(point_balance, 0) as point_balance,
        true as is_active
      FROM users
      WHERE role = 'applicant'
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    // Get user statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN u.is_approved = true THEN 1 END) as approved_users,
        COUNT(CASE WHEN u.is_approved = false THEN 1 END) as pending_users,
        COUNT(CASE WHEN u.role = 'village_admin' THEN 1 END) as village_admins,
        0 as active_users
      FROM users u
     WHERE u.role = 'applicant'
    `;

    // Log the access for audit purposes
try {
      await sql`
        INSERT INTO audit_logs (
          user_id, action, resource_type, details, ip_address, created_at
        ) VALUES (
          ${authResult.user.userId}, 'VIEW_USERS', 'users',
          ${JSON.stringify({ 
            userCount: users.length,
            stats: stats[0] || {}
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'},
          NOW()
        )
      `;
    } catch (auditError) {
      console.log('Audit logging skipped:', auditError.message);
    }
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
