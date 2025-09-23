import { neon } from '@neondatabase/serverless';
import { requireVillageAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  // SECURITY: CORS origin validation
  const getAllowedOrigin = (event) => {
    const origin = event.headers.origin || event.headers.Origin;
    
    const allowedOrigins = [
      'https://iramm.netlify.app',
    ];
    
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      );
    }
    
    if (origin && allowedOrigins.includes(origin)) {
      return origin;
    }
    
    return allowedOrigins[0] || 'https://iramm.netlify.app';
  };
 const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
   // JWT-based authentication
    const authResult = requireVillageAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }
    const adminInfo = authResult.user;

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
      WHERE id = ${applicationId}::uuid AND village_id = ${adminInfo.villageId}::uuid
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
