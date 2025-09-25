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

    const applicationNumber = event.queryStringParameters?.applicationNumber;
    
    if (!applicationNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Application number is required' })
      };
    }

    // Search for application by number (public access)
    const applications = await sql`
      SELECT 
        a.id,
        a.application_number,
        a.applicant_name,
        a.father_name,
        a.status,
        a.created_at,
        a.approved_at,
        v.name as village_name
      FROM noc_applications a
      LEFT JOIN villages v ON a.village_id = v.id
      WHERE a.application_number = ${applicationNumber}
    `;

    if (applications.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        application: applications[0]
      })
    };

  } catch (error) {
    console.error('Search application error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to search application' })
    };
  }
};
