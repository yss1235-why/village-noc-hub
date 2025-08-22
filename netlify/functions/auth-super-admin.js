import { sql } from './utils/db.js';
import bcrypt from 'bcrypt';
export const handler = async (event, context) => {
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
    const { username, password } = JSON.parse(event.body);

    // First, check if user exists in database
    const user = await sql`
      SELECT id, email, password_hash, role 
      FROM users 
      WHERE email = ${username} AND role = 'super_admin' AND is_approved = true
    `;

    if (user.length > 0) {
      // Check database password
      const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
      if (isValidPassword) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            user: { 
              id: user[0].id, 
              role: user[0].role,
              email: user[0].email 
            }
          })
        };
      } else {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }
    }

    // Fallback to hardcoded credentials only if no user in database
    if (username === 'superadmin' && password === 'super123') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          user: { 
            id: 'super-admin-1', 
            role: 'super_admin',
            email: 'superadmin@noc.com' 
          }
        })
      };
    }
    // Alternative: Database lookup (commented out for now)
    /*
    const user = await sql`
      SELECT id, email, password_hash, role 
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

    const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        user: { 
          id: user[0].id, 
          role: user[0].role,
          email: user[0].email 
        }
      })
    };
    */

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid credentials' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
