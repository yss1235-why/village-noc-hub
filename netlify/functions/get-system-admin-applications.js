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
    // Get applications across all villages with enhanced details
    const applications = await sql`
      SELECT 
        a.id,
        a.application_number,
        a.applicant_name,
        a.father_name,
        a.address,
        a.purpose_of_noc,
        a.annual_income,
        a.phone,
        a.email,
        a.status,
        a.admin_notes,
        a.created_at,
        a.approved_at,
        a.rejected_at,
        v.name as village_name,
        v.district,
        v.state,
        COALESCE(u.name, 'N/A') as applicant_user_name,
        COALESCE(u.point_balance, 0) as point_balance
     FROM noc_applications a
      LEFT JOIN villages v ON a.village_id = v.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE v.status = 'approved'
      ORDER BY a.created_at DESC
      LIMIT 1000
    `;

    // Get summary statistics
    const stats = await sql`
     SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN a.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_applications
     FROM noc_applications a
      LEFT JOIN villages v ON a.village_id = v.id
      WHERE (v.status = 'approved' OR v.status IS NULL)
    `;

    // Log the access for audit purposes
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'VIEW_APPLICATIONS', 'applications',
        ${JSON.stringify({ 
          applicationCount: applications.length,
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
        applications: applications,
        statistics: stats[0],
        totalCount: applications.length
      })
    };

  } catch (error) {
    console.error('Get system admin applications error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve applications data' })
    };
  }
};
