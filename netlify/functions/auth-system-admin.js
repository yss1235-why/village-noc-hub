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
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    // Find system admin user
    const user = await sql`
      SELECT id, name, email, password_hash, role, is_approved, is_active
      FROM users 
      WHERE email = ${email.toLowerCase()} AND role = 'admin' 
      AND is_approved = true AND is_active = true
    `;

    if (user.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    const userData = user[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      // Log failed login attempt
      await sql`
        INSERT INTO security_logs (
          user_id, action, details, ip_address, created_at
        ) VALUES (
          ${userData.id}, 'FAILED_LOGIN', 
          ${JSON.stringify({ reason: 'Invalid password', email: email })},
          ${event.headers['x-forwarded-for'] || 'unknown'},
          NOW()
        )
      `;

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    // Generate JWT token
    const tokenPayload = {
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      name: userData.name
    };

    const token = generateToken(tokenPayload);

    // Update last login timestamp
    await sql`
      UPDATE users 
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = ${userData.id}
    `;

    // Log successful login
    await sql`
      INSERT INTO security_logs (
        user_id, action, details, ip_address, created_at
      ) VALUES (
        ${userData.id}, 'SUCCESSFUL_LOGIN', 
        ${JSON.stringify({ role: userData.role, loginTime: new Date() })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

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
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
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
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};
