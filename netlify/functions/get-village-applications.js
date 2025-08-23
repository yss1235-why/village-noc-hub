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
    const { villageId } = event.queryStringParameters;

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID is required' })
      };
    }

    // Get all applications for this village
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
        admin_notes,
        created_at,
        approved_at
      FROM noc_applications 
      WHERE village_id = ${villageId}
      ORDER BY created_at DESC
    `;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ applications })
    };

  } catch (error) {
    console.error('Get village applications error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load applications' })
    };
  }
};
