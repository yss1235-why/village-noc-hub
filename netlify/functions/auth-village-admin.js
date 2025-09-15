import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
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

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            user: newUser[0],
            village: {
              id: villageData.id,
              name: villageData.name,
              district: villageData.district,
              state: villageData.state
            },
            message: 'Please change your password after login'
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user[0].id,
          email: user[0].email
        },
        village: {
          id: villageData.id,
          name: villageData.name,
          district: villageData.district,
          state: villageData.state
        }
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
