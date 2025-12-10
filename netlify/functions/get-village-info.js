import { neon } from '@neondatabase/serverless';
import { requireVillageAdmin } from './utils/auth-middleware.js';

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
    // Authenticate - require village admin
    const authResult = requireVillageAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const { villageId } = event.queryStringParameters || {};

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID is required' })
      };
    }

    // Security check: Ensure admin can only access their own village data
    if (authResult.user.villageId !== villageId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied - you can only view your own village information' })
      };
    }

    // Get village information
    const village = await sql`
      SELECT 
        id, 
        name, 
        district, 
        state, 
        pin_code, 
        admin_name, 
        admin_email,
        COALESCE(post_office, '') as post_office,
        COALESCE(police_station, '') as police_station,
        COALESCE(sub_division, '') as sub_division
      FROM villages 
      WHERE id = ${villageId}::uuid
    `;

    if (village.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Village not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ village: village[0] })
    };

  } catch (error) {
    console.error('Get village info error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load village information',
        details: error.message
      })
    };
  }
};
