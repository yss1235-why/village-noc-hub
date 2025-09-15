import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { villageId } = JSON.parse(event.body);

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID is required' })
      };
    }

    // Check if village has any applications
    const applications = await sql`
      SELECT COUNT(*) as count FROM noc_applications 
      WHERE village_id = ${villageId}
    `;

    if (applications[0].count > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot delete village with existing applications. Please archive or transfer applications first.' 
        })
      };
    }

    // Delete associated users first (foreign key constraint)
    await sql`
      DELETE FROM users WHERE village_id = ${villageId}
    `;

    // Delete the village
    const result = await sql`
      DELETE FROM villages WHERE id = ${villageId}
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
        message: `Village "${result[0].name}" has been deleted successfully` 
      })
    };

  } catch (error) {
    console.error('Village deletion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete village' })
    };
  }
};
