


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
    const { currentPassword, newPassword } = JSON.parse(event.body);

    // For now, check against hardcoded current password
    if (currentPassword !== 'super123') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Current password is incorrect' })
      };
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update or insert super admin user in database
    const existingUser = await sql`
      SELECT id FROM users WHERE role = 'super_admin' LIMIT 1
    `;

    if (existingUser.length > 0) {
      // Update existing super admin
      await sql`
        UPDATE users 
        SET password_hash = ${hashedPassword}
        WHERE role = 'super_admin'
      `;
    } else {
      // Insert new super admin
      await sql`
        INSERT INTO users (email, password_hash, role, is_approved)
        VALUES ('superadmin@noc.com', ${hashedPassword}, 'super_admin', true)
      `;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Password updated successfully' 
      })
    };

  } catch (error) {
    console.error('Password change error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update password' })
    };
  }
};
