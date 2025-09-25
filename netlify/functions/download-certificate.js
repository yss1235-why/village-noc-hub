import { neon } from '@neondatabase/serverless';
import { authenticateUser } from './utils/auth-middleware.js';

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
    const authResult = authenticateUser(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const applicationId = event.queryStringParameters?.applicationId;
    
    if (!applicationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Application ID is required' })
      };
    }

    // Get application details
    const applications = await sql`
      SELECT 
        a.*,
        v.name as village_name,
        v.district,
        v.state,
        v.pin_code,
        v.post_office,
        v.police_station,
        v.sub_division,
        v.admin_name
      FROM noc_applications a
      LEFT JOIN villages v ON a.village_id = v.id
      WHERE a.id = ${applicationId} AND a.status = 'approved'
    `;

    if (applications.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Approved application not found' })
      };
    }

    const application = applications[0];

    // Get village documents for certificate generation
    const documents = await sql`
      SELECT letterhead_url, signature_url, seal_url, certificate_template
      FROM villages
      WHERE id = ${application.village_id}
    `;

    // For now, return a simple response indicating certificate generation
    // In production, this would generate and return a PDF certificate
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Certificate generation initiated',
        application: {
          id: application.id,
          application_number: application.application_number,
          applicant_name: application.applicant_name,
          status: application.status
        }
      })
    };

  } catch (error) {
    console.error('Download certificate error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to download certificate' })
    };
  }
};
