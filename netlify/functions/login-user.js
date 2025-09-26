import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { generateToken } from './utils/jwt.js';

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
    const { login, password } = JSON.parse(event.body); // login can be username or email

    if (!login || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Login and password are required' })
      };
    }

    // Find user by username or email
    const user = await sql`
      SELECT id, username, email, password_hash, role, is_approved, 
             point_balance, full_name, village_id
      FROM users 
      WHERE (username = ${login} OR email = ${login})
      AND role IN ('applicant', 'village_admin', 'super_admin')
    `;

    if (user.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    const userData = user[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Check if user is approved (except for super_admin and village_admin)
    if (userData.role === 'applicant' && !userData.is_approved) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Account pending approval',
          status: 'pending_approval'
        })
      };
    }

    // Generate JWT token
    const tokenPayload = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      villageId: userData.village_id,
      pointBalance: userData.point_balance
    };

    const token = generateToken(tokenPayload);

   // Prepare successful response
    const successResponse = {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
      },
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          fullName: userData.full_name,
          role: userData.role,
          pointBalance: userData.point_balance,
          isApproved: userData.is_approved
        },
        token
      })
    };

    // Log successful login (non-blocking)
    try {
      await sql`
        INSERT INTO admin_audit_log (admin_id, action, details, ip_address)
        VALUES (
          ${userData.id}, 
          'USER_LOGIN', 
          ${JSON.stringify({ username: userData.username, role: userData.role })},
          ${event.headers['x-forwarded-for'] || 'unknown'}
        )
      `;
    } catch (auditError) {
      console.error('Audit log insertion failed:', auditError);
      // Continue with login success despite audit log failure
    }

    return successResponse;
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Login failed. Please try again.' })
    };
  }
};
