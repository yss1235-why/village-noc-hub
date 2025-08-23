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
    const { villageId, adminName, email, phone, currentPassword, newPassword } = JSON.parse(event.body);

    if (!villageId || !adminName || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID, admin name, and email are required' })
      };
    }

    // Update village admin info
    await sql`
      UPDATE villages 
      SET admin_name = ${adminName}, admin_email = ${email}
      WHERE id = ${villageId}
    `;

    // Update or create user record
    if (newPassword && currentPassword) {
      // Validate current password first
      const user = await sql`
        SELECT password_hash FROM users 
        WHERE village_id = ${villageId} AND role = 'village_admin'
      `;

      if (user.length > 0) {
        const isValidPassword = await bcrypt.compare(currentPassword, user[0].password_hash);
        if (!isValidPassword) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Current password is incorrect' })
          };
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await sql`
          UPDATE users 
          SET password_hash = ${hashedPassword}, phone = ${phone || null}
          WHERE village_id = ${villageId} AND role = 'village_admin'
        `;
      } else {
        // Create new user record
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await sql`
          INSERT INTO users (email, password_hash, role, village_id, phone, is_approved)
          VALUES (${email}, ${hashedPassword}, 'village_admin', ${villageId}, ${phone || null}, true)
        `;
      }
    } else {
      // Update phone only
      await sql`
        UPDATE users 
        SET phone = ${phone || null}
        WHERE village_id = ${villageId} AND role = 'village_admin'
      `;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Profile updated successfully' 
      })
    };

  } catch (error) {
    console.error('Update admin profile error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update profile' })
    };
  }
};
