import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { generateToken } from './utils/jwt.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const { login, password } = JSON.parse(event.body);

if (!login || !password) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Email and password are required' })
  };
}

// Use login as email for database query
const email = login;

    // Find system admin user in system_admins table
    const adminResult = await sql`
      SELECT id, name, email, password, permissions, is_active
      FROM system_admins 
      WHERE email = ${email.toLowerCase()} AND is_active = true
    `;

    if (adminResult.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    const adminData = adminResult[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminData.password);
    
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

   // Generate JWT token using the proper utility
   const tokenPayload = {
    id: adminData.id,
    email: adminData.email,
    role: 'admin',
    name: adminData.name,
    permissions: adminData.permissions
  };

    const token = generateToken(tokenPayload);

    // Update last login timestamp if the column exists
    try {
      await sql`
        UPDATE system_admins 
        SET updated_at = NOW()
        WHERE id = ${adminData.id}
      `;
    } catch (updateError) {
      // Column might not exist, continue without error
      console.warn('Could not update last login timestamp:', updateError);
    }

    // Set secure HTTP-only cookie
    const cookieOptions = [
      `auth-token=${token}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      `Max-Age=${24 * 60 * 60}`, // 24 hours
      'Path=/'
    ];

   return {
  statusCode: 200,
  headers: {
    ...headers,
    'Set-Cookie': cookieOptions.join('; ')
  },
  body: JSON.stringify({
    success: true,
    user: {
      id: adminData.id,
      username: adminData.email,
      email: adminData.email,
      fullName: adminData.name || adminData.email,
      role: 'admin',
      pointBalance: 0,
      isApproved: true,
      permissions: adminData.permissions
    },
    token: token,
    message: 'System administrator login successful'
  })
};

  } catch (error) {
    console.error('System admin auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
