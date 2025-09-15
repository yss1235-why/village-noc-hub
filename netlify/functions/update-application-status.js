import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
 const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-session, x-village-id',
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
    // SECURITY FIX: Check for admin session
    const adminSession = event.headers['x-admin-session'];
    const villageId = event.headers['x-village-id'];
    
    if (!adminSession || !villageId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Unauthorized: Admin login required to approve applications' 
        })
      };
    }

    // SECURITY FIX: Verify admin session exists in localStorage format
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
          error: 'Forbidden: You can only approve applications for your village' 
        })
      };
    }

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

    if (applicationCheck[0].village_id !== villageId) {
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
        approved_by = ${status === 'approved' ? adminInfo.id : null}
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
