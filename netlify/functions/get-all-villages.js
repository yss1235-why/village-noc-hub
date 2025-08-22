import { sql } from './utils/db.js';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET',
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
    const villages = await sql`
      SELECT 
        id,
        name as villageName,
        district,
        state,
        pin_code as pinCode,
        admin_name as adminName,
        admin_email as email,
        status,
        created_at as requestDate
      FROM villages 
      ORDER BY created_at DESC
    `;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ villages })
    };

  } catch (error) {
    console.error('Get villages error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load villages' })
    };
  }
};
