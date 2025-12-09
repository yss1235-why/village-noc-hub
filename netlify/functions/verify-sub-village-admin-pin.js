import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { generateToken } from './utils/jwt.js';
import crypto from 'crypto';

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

  try {
    const { villageId, pin } = JSON.parse(event.body);

    if (!villageId || !pin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and PIN are required' })
      };
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'PIN must be exactly 4 digits' })
      };
    }

    // Get all active sub village admins for this village
    const subAdmins = await sql`
      SELECT 
        sva.id,
        sva.village_id,
        sva.full_name,
        sva.phone_number,
        sva.pin_hash,
        sva.is_primary,
        sva.is_active,
        sva.is_locked,
        sva.failed_pin_attempts,
        sva.locked_at,
        sva.consecutive_lockout_count,
        sva.pin_reset_required,
        sva.signature_image,
        sva.seal_image,
        dt.name as designation,
        dt.id as designation_id,
        v.name as village_name,
        v.district,
        v.state
      FROM sub_village_admins sva
      JOIN designation_types dt ON sva.designation_id = dt.id
      JOIN villages v ON sva.village_id = v.id
      WHERE sva.village_id = ${villageId} AND sva.is_active = true
    `;

    if (subAdmins.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'No sub village admins found for this village',
          requiresSetup: true
        })
      };
    }

    // Try to find matching PIN
    let matchedAdmin = null;
    for (const admin of subAdmins) {
      // Check if this admin is locked
      if (admin.is_locked) {
        const lockedAt = new Date(admin.locked_at);
        const now = new Date();
        const minutesSinceLock = (now - lockedAt) / (1000 * 60);
        
        // Check if 10 minutes have passed
        if (minutesSinceLock < 10) {
          continue; // Skip this admin, still locked
        } else {
          // Unlock the admin after 10 minutes
          await sql`
            UPDATE sub_village_admins 
            SET is_locked = false, failed_pin_attempts = 0, locked_at = NULL
            WHERE id = ${admin.id}
          `;
          admin.is_locked = false;
          admin.failed_pin_attempts = 0;
        }
      }

      // Check if PIN reset is required
      if (admin.pin_reset_required) {
        continue; // Skip this admin, they need PIN reset
      }

      // Verify PIN
      const isPinValid = await bcrypt.compare(pin, admin.pin_hash);
      if (isPinValid) {
        matchedAdmin = admin;
        break;
      }
    }

    if (!matchedAdmin) {
      // PIN didn't match any admin - increment failed attempts for all non-locked admins
      // This is a security measure since we don't know which admin was attempting
      const ipAddress = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      
      // Log failed attempt
      await sql`
        INSERT INTO village_admin_audit_log (
          village_id, sub_village_admin_id, sub_village_admin_name, designation,
          action_type, ip_address, details, created_at
        )
        SELECT 
          ${villageId},
          id,
          full_name,
          (SELECT name FROM designation_types WHERE id = designation_id),
          'FAILED_PIN_ATTEMPT',
          ${ipAddress},
          ${JSON.stringify({ reason: 'Invalid PIN entered' })},
          NOW()
        FROM sub_village_admins
        WHERE village_id = ${villageId} AND is_active = true AND is_locked = false
        LIMIT 1
      `;

      // Check if any admin has too many failed attempts
      for (const admin of subAdmins) {
        if (!admin.is_locked && !admin.pin_reset_required) {
          const newAttempts = admin.failed_pin_attempts + 1;
          
          if (newAttempts >= 3) {
            // Lock the account
            const newConsecutiveLockouts = admin.consecutive_lockout_count + 1;
            const requirePinReset = newConsecutiveLockouts >= 2;
            
            await sql`
              UPDATE sub_village_admins 
              SET 
                is_locked = true,
                failed_pin_attempts = ${newAttempts},
                locked_at = NOW(),
                consecutive_lockout_count = ${newConsecutiveLockouts},
                pin_reset_required = ${requirePinReset}
              WHERE id = ${admin.id}
            `;
          } else {
            await sql`
              UPDATE sub_village_admins 
              SET failed_pin_attempts = ${newAttempts}
              WHERE id = ${admin.id}
            `;
          }
        }
      }

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid PIN' })
      };
    }

    // PIN matched - reset failed attempts and consecutive lockout count
    await sql`
      UPDATE sub_village_admins 
      SET 
        failed_pin_attempts = 0,
        consecutive_lockout_count = 0,
        updated_at = NOW()
      WHERE id = ${matchedAdmin.id}
    `;

    // Log successful login
    const ipAddress = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';
    
    await sql`
      INSERT INTO village_admin_audit_log (
        village_id, sub_village_admin_id, sub_village_admin_name, designation,
        action_type, ip_address, user_agent, created_at
      ) VALUES (
        ${villageId}, ${matchedAdmin.id}, ${matchedAdmin.full_name}, ${matchedAdmin.designation},
        'LOGIN', ${ipAddress}, ${userAgent}, NOW()
      )
    `;

    // Generate token with sub village admin identity
    const tokenPayload = {
      id: matchedAdmin.id,
      villageId: matchedAdmin.village_id,
      villageName: matchedAdmin.village_name,
      role: 'village_admin',
      subVillageAdminId: matchedAdmin.id,
      subVillageAdminName: matchedAdmin.full_name,
      designation: matchedAdmin.designation,
      designationId: matchedAdmin.designation_id,
      isPrimary: matchedAdmin.is_primary,
      sessionId: crypto.randomUUID()
    };

    const token = generateToken(tokenPayload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'PIN verified successfully',
        user: {
          id: matchedAdmin.id,
          villageId: matchedAdmin.village_id,
          villageName: matchedAdmin.village_name,
          fullName: matchedAdmin.full_name,
          designation: matchedAdmin.designation,
          isPrimary: matchedAdmin.is_primary,
          role: 'village_admin',
          district: matchedAdmin.district,
          state: matchedAdmin.state
        },
        token: token
      })
    };

  } catch (error) {
    console.error('PIN verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'PIN verification failed' })
    };
  }
};
