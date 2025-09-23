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

  // Clear HTTP-only cookie
  const cookieOptions = [
    'auth-token=',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Max-Age=0', // Expire immediately
    'Path=/'
  ];

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Set-Cookie': cookieOptions.join('; ')
    },
    body: JSON.stringify({ success: true, message: 'Logged out successfully' })
  };
};
