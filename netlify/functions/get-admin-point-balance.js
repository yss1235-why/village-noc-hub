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

    // Get user ID from authenticated user token
    const userId = authResult.user.id;
    const villageId = authResult.user.villageId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID not found in session' })
      };
    }

    // First, try to get points for the logged-in user directly
    // This ensures the same user record used for login shows their points
    const userPoints = await sql`
      SELECT point_balance
      FROM users
      WHERE id = ${userId}
    `;

    if (userPoints.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          pointBalance: userPoints[0].point_balance || 0
        })
      };
    }

    // Fallback: Query by village_id and role if user not found by ID
    // This handles legacy cases or sub-admin queries
    if (villageId) {
      const villagePoints = await sql`
        SELECT point_balance
        FROM users
        WHERE village_id = ${villageId} AND role = 'village_admin'
      `;

      if (villagePoints.length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            pointBalance: villagePoints[0].point_balance || 0
          })
        };
      }
    }

    // No points found - return 0 instead of error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pointBalance: 0
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
