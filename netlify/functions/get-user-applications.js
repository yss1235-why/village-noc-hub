import { neon } from '@neondatabase/serverless';
import { requireApprovedUser } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
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

  try {
    const authResult = requireApprovedUser(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const userId = event.queryStringParameters?.userId || authResult.user.userId || authResult.user.id;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Verify user is requesting their own applications
    if (userId !== (authResult.user.userId || authResult.user.id)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Can only view your own applications' })
      };
    }

    // Get user applications
    const applications = await sql`
      SELECT 
        a.id,
        a.application_number,
        a.applicant_name,
        a.father_name,
        a.status,
        a.created_at,
        a.approved_at,
        v.name as village_name
      FROM noc_applications a
      LEFT JOIN villages v ON a.village_id = v.id
      WHERE a.user_id = ${userId}
      ORDER BY a.created_at DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        applications: applications || []
      })
    };

  } catch (error) {
    console.error('Get user applications error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch applications' })
    };
  }
};
