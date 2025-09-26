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

    // Token is valid, return success with user data
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
          pointBalance: authResult.user.pointBalance || 0,
          isApproved: authResult.user.isApproved !== false,
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
