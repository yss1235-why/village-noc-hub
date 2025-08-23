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
    const { villageId, newPassword } = JSON.parse(event.body);

    if (!villageId || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and new password are required' })
      };
    }

    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 6 characters long' })
      };
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the village admin password
    const result = await sql`
      UPDATE users 
      SET password_hash = ${hashedPassword}
      WHERE village_id = ${villageId} AND role = 'village_admin'
      RETURNING email
    `;

    if (result.length === 0) {
      // If no user exists, create one
      const village = await sql`
        SELECT admin_email FROM villages WHERE id = ${villageId}
      `;

      if (village.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Village not found' })
        };
      }

      await sql`
        INSERT INTO users (email, password_hash, role, village_id, is_approved)
        VALUES (${village[0].admin_email}, ${hashedPassword}, 'village_admin', ${villageId}, true)
      `;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Admin password updated successfully' 
      })
    };

  } catch (error) {
    console.error('Admin password change error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update admin password' })
    };
  }
};
