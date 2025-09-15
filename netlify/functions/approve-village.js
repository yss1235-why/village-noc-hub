import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT',
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
