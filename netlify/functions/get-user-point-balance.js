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

    // Verify user is requesting their own points
    if (userId !== (authResult.user.userId || authResult.user.id)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Can only view your own point balance' })
      };
    }

    // Get user point balance
    const userPoints = await sql`
      SELECT point_balance
      FROM users 
      WHERE id = ${userId} AND role IN ('user', 'applicant')
    `;

    if (userPoints.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        pointBalance: userPoints[0].point_balance || 0
      })
    };

  } catch (error) {
    console.error('Get user point balance error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch point balance' })
    };
  }
};
