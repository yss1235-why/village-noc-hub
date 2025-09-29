import { neon } from '@neondatabase/serverless';
import { requirePermission } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if user has permission to approve villages
  const authResult = requirePermission(event, 'approve_village');
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  try {
    const { villageId, action } = JSON.parse(event.body);

    if (!villageId || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and action are required' })
      };
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    const result = await sql`
      UPDATE villages 
      SET status = ${newStatus}
      WHERE id = ${villageId}
      RETURNING name
    `;

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Village not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `Village "${result[0].name}" has been ${newStatus}` 
      })
    };

  } catch (error) {
    console.error('Village approval error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update village status' })
    };
  }
};
