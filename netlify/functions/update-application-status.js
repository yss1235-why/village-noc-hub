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
    const { applicationId, status, approvedBy, adminNotes } = JSON.parse(event.body);

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

    // Update application status
    const result = await sql`
      UPDATE noc_applications 
      SET 
        status = ${status},
        admin_notes = ${adminNotes || null},
        approved_at = ${status === 'approved' ? new Date().toISOString() : null},
        approved_by = ${status === 'approved' ? approvedBy : null}
      WHERE id = ${applicationId}
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
