import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateToken } from './utils/jwt.js';
export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);




  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Credentials': 'true'
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

    // Find village by admin email
    const village = await sql`
      SELECT v.id, v.name, v.district, v.state, v.admin_email, v.status
      FROM villages v
      WHERE v.admin_email = ${email}
    `;

    if (village.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    const villageData = village[0];

    // Check if village is approved
    if (villageData.status !== 'approved') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Your village registration is not yet approved. Please contact the super admin.' 
        })
      };
    }

    // Check if user exists in users table
    const user = await sql`
      SELECT id, email, password_hash
      FROM users 
      WHERE village_id = ${villageData.id} AND role = 'village_admin'
    `;

    if (user.length === 0) {
      // For new villages, check default password (admin123)
      if (password === 'admin123') {
        // Create user record with default password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await sql`
          INSERT INTO users (email, password_hash, role, village_id, is_approved)
          VALUES (${email}, ${hashedPassword}, 'village_admin', ${villageData.id}, true)
          RETURNING id, email
        `;
// Generate JWT token
        const tokenPayload = {
          userId: newUser[0].id,
          email: newUser[0].email,
          role: 'village_admin',
          villageId: villageData.id,
          villageName: villageData.name,
          sessionId: crypto.randomUUID(),
          isDefaultPassword: true // Flag for password change requirement
        };

        const token = generateToken(tokenPayload);

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
              id: newUser[0].id,
              email: newUser[0].email,
              role: 'village_admin'
            },
            village: {
              id: villageData.id,
              name: villageData.name,
              district: villageData.district,
              state: villageData.state
            },
            token: token,
            message: 'Please change your password after login',
            requirePasswordChange: true
          })
        };
      } else {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid email or password' })
        };
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }
// Generate JWT token
    const tokenPayload = {
      userId: user[0].id,
      email: user[0].email,
      role: 'village_admin',
      villageId: villageData.id,
      villageName: villageData.name,
      sessionId: crypto.randomUUID()
    };

    const token = generateToken(tokenPayload);

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
          id: user[0].id,
          email: user[0].email,
          role: 'village_admin'
        },
        village: {
          id: villageData.id,
          name: villageData.name,
          district: villageData.district,
          state: villageData.state
        },
        token: token
      })
    };

  } catch (error) {
    console.error('Village admin auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};
