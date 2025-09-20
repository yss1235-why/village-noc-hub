import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-session, x-village-id',
    'Access-Control-Allow-Methods': 'GET',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // SECURITY: Require admin authentication for full application details
    const adminSession = event.headers['x-admin-session'];
    const villageId = event.headers['x-village-id'];
    
    if (!adminSession || !villageId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Unauthorized: Admin login required to view full application details' 
        })
      };
    }

    // Verify admin session
    let adminInfo;
    try {
      adminInfo = JSON.parse(adminSession);
    } catch {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid admin session' })
      };
    }

    if (!adminInfo.villageId || adminInfo.villageId !== villageId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Forbidden: You can only view applications from your village' 
        })
      };
    }

    const { applicationId } = event.queryStringParameters;

    if (!applicationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Application ID is required' })
      };
    }

    // SECURITY: Only return applications from admin's village
    const application = await sql`
      SELECT * FROM noc_applications 
      WHERE id = ${applicationId}::uuid AND village_id = ${villageId}::uuid
    `;

    if (!application.length) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Application not found or you do not have permission to view it' 
        })
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
