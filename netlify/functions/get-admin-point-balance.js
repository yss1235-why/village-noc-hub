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

    // Get villageId from authenticated user (works for both primary and sub-admins)
    const villageId = authResult.user.villageId;

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID not found in user session' })
      };
    }

    // Get village point balance (shared by all admins in the village)
    // This queries the primary village admin's point balance in the users table
    const villagePoints = await sql`
      SELECT point_balance
      FROM users
      WHERE village_id = ${villageId} AND role = 'village_admin'
    `;

    if (villagePoints.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Village admin account not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pointBalance: villagePoints[0].point_balance || 0
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
