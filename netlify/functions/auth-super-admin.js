import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { login, password } = JSON.parse(event.body);

if (!login || !password) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Email and password are required' })
  };
}

// Use login as username for database query  
const username = login;

    // Database lookup with proper email matching
    const user = await sql`
      SELECT id, email, password_hash, role, full_name
      FROM users 
      WHERE email = ${username} AND role = 'super_admin' AND is_approved = true
    `;

    if (user.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Generate JWT token following project security standards
    const { generateToken } = await import('./utils/jwt.js');
    
    const tokenPayload = {
      id: user[0].id,
      email: user[0].email,
      role: user[0].role,
      sessionId: crypto.randomUUID()
    };

    const token = generateToken(tokenPayload);

    // Set secure HTTP-only cookie following project standards
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
          id: user[0].id,
          username: user[0].email,
          email: user[0].email,
          fullName: user[0].full_name || 'Super Administrator',
          role: user[0].role,
          pointBalance: 0,
          isApproved: true
        },
        token: token
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
