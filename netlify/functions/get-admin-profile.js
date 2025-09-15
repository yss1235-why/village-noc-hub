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

  try {
    const { villageId } = event.queryStringParameters || {};
    
    const village = await sql`
      SELECT * FROM villages WHERE id = ${villageId}::uuid
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        village: village[0] || null,
        count: village.length
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
