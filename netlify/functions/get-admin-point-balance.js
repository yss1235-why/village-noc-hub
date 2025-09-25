import { neon } from '@neondatabase/serverless';
import { requireMinimumRole } from './utils/auth-middleware.js';

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
    const authResult = requireMinimumRole(event, 'village_admin');
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const adminId = event.queryStringParameters?.adminId || authResult.user.userId || authResult.user.id;
    
    if (!adminId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Admin ID is required' })
      };
    }

    // Verify the admin is requesting their own points
    if (adminId !== (authResult.user.userId || authResult.user.id)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Can only view your own point balance' })
      };
    }

    // Get admin point balance
    const adminPoints = await sql`
      SELECT point_balance
      FROM users 
      WHERE id = ${adminId} AND role = 'village_admin'
    `;

    if (adminPoints.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Village admin not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        pointBalance: adminPoints[0].point_balance || 0
      })
    };

  } catch (error) {
    console.error('Get admin point balance error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch point balance' })
    };
  }
};
