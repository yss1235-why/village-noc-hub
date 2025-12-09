import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { requireVillageAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
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

  // Authenticate
  const authResult = requireVillageAdmin(event);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  const userInfo = authResult.user;

  try {
    const { currentPin, newPin } = JSON.parse(event.body);

    if (!currentPin || !newPin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Current PIN and new PIN are required' })
      };
    }

    // Validate new PIN format
    if (!/^\d{4}$/.test(newPin)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'New PIN must be exactly 4 digits' })
      };
    }

    // Get current admin's PIN hash
    const admin = await sql`
      SELECT id, pin_hash, full_name
      FROM sub_village_admins 
      WHERE id = ${userInfo.subVillageAdminId}
    `;

    if (admin.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Admin not found' })
      };
    }

    // Verify current PIN
    const isCurrentPinValid = await bcrypt.compare(currentPin, admin[0].pin_hash);
    if (!isCurrentPinValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Current PIN is incorrect' })
      };
    }

    // Hash new PIN
    const newPinHash = await bcrypt.hash(newPin, 10);

    // Update PIN
    await sql`
      UPDATE sub_village_admins 
      SET 
        pin_hash = ${newPinHash},
        pin_reset_required = false,
        updated_at = NOW()
      WHERE id = ${userInfo.subVillageAdminId}
    `;

    // Log the action
    const ipAddress = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    await sql`
      INSERT INTO village_admin_audit_log (
        village_id, sub_village_admin_id, sub_village_admin_name, designation,
        action_type, ip_address, created_at
      ) VALUES (
        ${userInfo.villageId}, ${userInfo.subVillageAdminId}, ${userInfo.subVillageAdminName}, 
        ${userInfo.designation}, 'CHANGE_PIN', ${ipAddress}, NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'PIN changed successfully'
      })
    };

  } catch (error) {
    console.error('Change PIN error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to change PIN' })
    };
  }
};
