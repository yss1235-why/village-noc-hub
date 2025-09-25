import { neon } from '@neondatabase/serverless';
import { requireSystemAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
   'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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
   const authResult = requireSystemAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

   const adminInfo = authResult.user;
    console.log('Admin info:', adminInfo); // Debug line
    const { userId, action, reason } = JSON.parse(event.body); // action: 'approve' or 'reject'
    console.log('Request data:', { userId, action, reason }); // Debug line

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid user ID and action (approve/reject) are required' })
      };
    }

    // Get user info
    const user = await sql`
      SELECT id, username, email, full_name, is_approved
      FROM users 
      WHERE id = ${userId} AND role = 'applicant'
    `;

    if (user.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    if (user[0].is_approved && action === 'approve') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User is already approved' })
      };
    }
if (action === 'approve') {
      // Approve user
      console.log('About to approve user:', userId); // Debug line
      try {
        await sql`
          UPDATE users 
          SET is_approved = true 
          WHERE id = ${userId}
        `;
        console.log('User approved successfully'); // Debug line
      } catch (updateError) {
        console.error('Update failed:', updateError);
        throw updateError;
      }

      // Return success immediately after UPDATE
      const successResponse = {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `User ${user[0].username} approved successfully`,
          user: {
            id: userId,
            username: user[0].username,
            fullName: user[0].full_name,
            status: 'approved'
          }
        })
      };

      // Try audit logging but don't fail if it crashes
      try {
        await sql`
          INSERT INTO admin_audit_log (admin_id, action, details, ip_address)
          VALUES (
            ${adminInfo.userId || adminInfo.id}, 
            'USER_APPROVED', 
            ${JSON.stringify({ 
              approvedUserId: userId, 
              approvedUsername: user[0].username,
              approvedUserEmail: user[0].email,
              reason: reason || 'User approved'
            })},
            ${event.headers['x-forwarded-for'] || 'unknown'}
          )
        `;
      } catch (auditError) {
        console.log('Audit logging failed but approval succeeded:', auditError.message);
      }

      return successResponse;

   } else if (action === 'reject') {
      // Delete the user
      await sql`DELETE FROM users WHERE id = ${userId}`;

      // Return success immediately after DELETE
      const successResponse = {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `User ${user[0].username} rejected and removed`,
          action: 'rejected'
        })
      };

      // Try audit logging but don't fail if it crashes
      try {
        await sql`
          INSERT INTO admin_audit_log (admin_id, action, details, ip_address)
          VALUES (
            ${adminInfo.userId || adminInfo.id}, 
            'USER_REJECTED', 
            ${JSON.stringify({ 
              rejectedUserId: userId, 
              rejectedUsername: user[0].username,
              rejectedUserEmail: user[0].email,
              reason: reason || 'User registration rejected'
            })},
            ${event.headers['x-forwarded-for'] || 'unknown'}
          )
        `;
      } catch (auditError) {
        console.log('Audit logging failed but rejection succeeded:', auditError.message);
      }

      return successResponse;
    }
  } catch (error) {
    console.error('Approve user error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process user approval' })
    };
  }
};
