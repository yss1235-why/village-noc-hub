import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const { applicationId } = event.queryStringParameters;

    if (!applicationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Application ID is required' })
      };
    }

    const application = await sql`
      SELECT * FROM noc_applications 
      WHERE id = ${applicationId}::uuid
    `;

    if (!application.length) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ application: application[0] })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
