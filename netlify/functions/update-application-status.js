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
      
      
    );
  }
  
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  
  return allowedOrigins[0] || 'https://your-domain.com';
};

 const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
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

    const { applicationId, status, adminNotes } = JSON.parse(event.body);

    if (!applicationId || !status) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Application ID and status are required' })
      };
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid status' })
      };
    }

    // SECURITY FIX: Verify application belongs to admin's village
    const applicationCheck = await sql`
      SELECT village_id FROM noc_applications 
      WHERE id = ${applicationId}::uuid
    `;

    if (applicationCheck.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

 if (applicationCheck[0].village_id !== adminInfo.villageId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Forbidden: This application belongs to a different village' 
        })
      };
    }

    // Update application status with proper admin ID
    const result = await sql`
      UPDATE noc_applications 
      SET 
        status = ${status},
        admin_notes = ${adminNotes || null},
        approved_at = ${status === 'approved' ? new Date().toISOString() : null},
       approved_by = ${status === 'approved' ? adminInfo.userId : null}
      WHERE id = ${applicationId}::uuid
      RETURNING application_number
    `;

    if (result.length === 0) {
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
        success: true, 
        message: `Application ${result[0].application_number} has been ${status}` 
      })
    };

  } catch (error) {
    console.error('Update application status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update application status',
        details: error.message 
      })
    };
  }
};
