import { authenticateUser } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Use existing auth middleware to validate token
    const authResult = authenticateUser(event);

    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: authResult.error 
        })
      };
    }

   // For applicant users, get current approval status from database
    let currentApprovalStatus = authResult.user.isApproved !== false;
    let currentPointBalance = authResult.user.pointBalance || 0;
    
    if (authResult.user.role === 'applicant') {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.NETLIFY_DATABASE_URL);
        
        const user = await sql`
          SELECT is_approved, point_balance 
          FROM users 
          WHERE id = ${authResult.user.id || authResult.user.userId}
        `;
        
        if (user.length > 0) {
          currentApprovalStatus = user[0].is_approved;
          currentPointBalance = user[0].point_balance || 0;
        }
      } catch (error) {
        console.error('Error fetching current user status:', error);
        // Fall back to token data if database query fails
      }
    }

    // Token is valid, return success with current user data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: authResult.user.id || authResult.user.userId,
          username: authResult.user.username,
          email: authResult.user.email,
          fullName: authResult.user.fullName || authResult.user.name,
          role: authResult.user.role,
          pointBalance: currentPointBalance,
          isApproved: currentApprovalStatus,
          villageId: authResult.user.villageId,
          villageName: authResult.user.villageName
        }
      })
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Token validation failed' 
      })
    };
  }
};
