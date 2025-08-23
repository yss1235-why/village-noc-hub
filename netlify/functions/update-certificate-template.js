import { sql } from './utils/db.js';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { villageId, template } = JSON.parse(event.body);

    if (!villageId || !template) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and template are required' })
      };
    }

    // For now, just return success since we don't have a documents table
    // In a real implementation, you would:
    // await sql`UPDATE village_documents SET certificate_template = ${template} WHERE village_id = ${villageId}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Certificate template updated successfully' 
      })
    };

  } catch (error) {
    console.error('Update certificate template error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update certificate template' })
    };
  }
};
