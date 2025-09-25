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
        id,
        application_number,
        applicant_name,
        father_name,
        address,
        purpose_of_noc,
        phone,
        email,
        status,
        created_at,
        approved_at
      FROM noc_applications
      ORDER BY created_at DESC
      LIMIT 1000
    `;

   // Get summary statistics (copying working AdminDashboard pattern)
    const stats = await sql`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_applications
      FROM noc_applications
    `;

    // Log the access for audit purposes
   try {
      await sql`
        INSERT INTO audit_logs (
          user_id, action, resource_type, details, ip_address, created_at
        ) VALUES (
          ${authResult.user.userId}, 'VIEW_APPLICATIONS', 'applications',
          ${JSON.stringify({ 
            applicationCount: applications.length,
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
