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
    // Get all villages with their statistics
    const villages = await sql`
      SELECT 
        v.id,
        v.name,
        v.district,
        v.state,
        v.pin_code,
        v.admin_name,
        v.admin_email,
        v.status,
        v.created_at,
        COUNT(DISTINCT a.id) as application_count,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as approved_applications,
        COUNT(DISTINCT CASE WHEN u.is_approved = true THEN u.id END) as approved_users
      FROM villages v
      LEFT JOIN applications a ON v.id = a.village_id
      LEFT JOIN users u ON v.id = u.village_id
      WHERE v.status = 'approved'
      GROUP BY v.id, v.name, v.district, v.state, v.pin_code, v.admin_name, v.admin_email, v.status, v.created_at
      ORDER BY v.name ASC
    `;

    // Log the access for audit purposes
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'VIEW_VILLAGES', 'villages',
        ${JSON.stringify({ villageCount: villages.length })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        villages: villages,
        totalCount: villages.length
      })
    };

  } catch (error) {
    console.error('Get system admin villages error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve villages data' })
    };
  }
};
