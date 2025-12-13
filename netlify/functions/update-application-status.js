import { neon } from '@neondatabase/serverless';
import { requireVillageAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
 // SECURITY: CORS origin validation
const getAllowedOrigin = (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  const allowedOrigins = [
    'https://iramm.netlify.app',
   
  ];
  
  if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
    allowedOrigins.push(
      
      
    );
  }
  
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  
  return allowedOrigins[0] || 'https://your-domain.com';
};

 const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
   // JWT-based authentication
    const authResult = requireVillageAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }
    const adminInfo = authResult.user;

    const { applicationId, status, adminNotes } = JSON.parse(event.body);

    if (!applicationId || !status) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Application ID and status are required' })
      };
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid status' })
      };
    }

    // SECURITY FIX: Verify application belongs to admin's village
    const applicationCheck = await sql`
      SELECT village_id FROM noc_applications 
      WHERE id = ${applicationId}::uuid
    `;

    if (applicationCheck.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

 if (applicationCheck[0].village_id !== adminInfo.villageId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Forbidden: This application belongs to a different village' 
        })
      };
    }
// ============================================
    // TODO: Re-enable PIN verification with session freshness check
    // This was disabled temporarily - implement idle timeout PIN re-verification later
    // ============================================
    /*
    // Verify PIN before approval (required for all status changes)
    const { pin } = JSON.parse(event.body);
    
    if (!pin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'PIN is required for approval actions' })
      };
    }

    // Verify PIN matches the logged-in sub village admin
    const subAdminForPin = await sql`
      SELECT id, pin_hash, full_name, is_locked, pin_reset_required
      FROM sub_village_admins 
      WHERE id = ${adminInfo.subVillageAdminId}
    `;

    if (subAdminForPin.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sub village admin not found' })
      };
    }

    if (subAdminForPin[0].is_locked) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Your account is locked. Please wait 10 minutes or contact primary admin.' })
      };
    }

    if (subAdminForPin[0].pin_reset_required) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'PIN reset required. Please reset your PIN before approving applications.' })
      };
    }

    const bcrypt = await import('bcrypt');
    const isPinValid = await bcrypt.compare(pin, subAdminForPin[0].pin_hash);
    
    if (!isPinValid) {
      // Increment failed attempts
      await sql`
        UPDATE sub_village_admins 
        SET failed_pin_attempts = failed_pin_attempts + 1
        WHERE id = ${adminInfo.subVillageAdminId}
      `;
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid PIN' })
      };
    }
    */

    // Get sub admin details for audit log (without PIN verification)
    const subAdmin = await sql`
      SELECT id, full_name
      FROM sub_village_admins 
      WHERE id = ${adminInfo.subVillageAdminId}
    `;

    if (subAdmin.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sub village admin not found' })
      };
    }

    // Get designation for audit log

    // Get designation for audit log
    const designation = await sql`
      SELECT dt.name 
      FROM sub_village_admins sva
      JOIN designation_types dt ON sva.designation_id = dt.id
      WHERE sva.id = ${adminInfo.subVillageAdminId}
    `;

    const designationName = designation[0]?.name || 'Unknown';

    // Start transaction for approval + point transfer
    await sql`BEGIN`;

    try {
      // Update application status with sub village admin details
      const result = await sql`
        UPDATE noc_applications
        SET
          status = ${status},
          admin_notes = ${adminNotes || null},
          approved_at = ${status === 'approved' ? new Date().toISOString() : null},
          approved_by = ${status === 'approved' ? adminInfo.userId : null},
          approved_by_sub_admin_id = ${status === 'approved' ? adminInfo.subVillageAdminId : null},
          approved_by_name = ${status === 'approved' ? subAdmin[0].full_name : null},
          approved_by_designation = ${status === 'approved' ? designationName : null}
        WHERE id = ${applicationId}::uuid
        RETURNING application_number, applicant_name, village_id
      `;

      // Transfer 5 points to village admin for processing (regardless of approve/reject)
      if (status === 'approved' || status === 'rejected') {
        const villageId = result[0].village_id;

        // Find the village admin user to credit points to
        // First try by village_id and role, then fallback to logged-in user
        let adminId = null;
        let currentAdminBalance = 0;

        // Try to find primary village admin for this village
        const villageAdmin = await sql`
          SELECT id, point_balance
          FROM users
          WHERE village_id = ${villageId} AND role = 'village_admin'
        `;

        if (villageAdmin.length > 0) {
          adminId = villageAdmin[0].id;
          currentAdminBalance = villageAdmin[0].point_balance || 0;
        } else {
          // Fallback: Use the logged-in user's ID (from JWT token)
          // This handles cases where village_admin user record doesn't exist
          console.log(`No village_admin user found for village ${villageId}, using logged-in user ${adminInfo.userId}`);

          const loggedInUser = await sql`
            SELECT id, point_balance
            FROM users
            WHERE id = ${adminInfo.userId}
          `;

          if (loggedInUser.length > 0) {
            adminId = loggedInUser[0].id;
            currentAdminBalance = loggedInUser[0].point_balance || 0;
          }
        }

        // Credit points if we found an admin user
        if (adminId) {
          const newAdminBalance = currentAdminBalance + 5;

          // Update village admin balance
          await sql`UPDATE users SET point_balance = ${newAdminBalance} WHERE id = ${adminId}`;

          // Create transaction record for admin points
          const crypto = await import('crypto');
          const adminTransactionHash = crypto.createHash('sha256')
            .update(`${adminId}-${applicationId}-${Date.now()}-processing`)
            .digest('hex');

          const reason = status === 'approved'
            ? 'Village Admin Commission - Application Approved'
            : 'Village Admin Commission - Application Rejected';

          await sql`
            INSERT INTO point_transactions (
              transaction_hash, user_id, type, amount, previous_balance, new_balance,
              application_id, reason, admin_ip
            )
            VALUES (
              ${adminTransactionHash}, ${adminId}, 'CREATE', 5, ${currentAdminBalance}, ${newAdminBalance},
              ${applicationId}, ${reason}, ${event.headers['x-forwarded-for'] || 'unknown'}
            )
          `;
        } else {
          console.error(`Could not find any admin user to credit points for village ${villageId}`);
        }

        // Update point distribution status from 'pending' to 'paid_out'
        await sql`
          UPDATE point_distributions
          SET status = 'paid_out', distributed_at = NOW()
          WHERE application_id = ${applicationId}
        `;
      }

      // Log the approval action
      const ipAddress = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      const userAgent = event.headers['user-agent'] || 'unknown';

      await sql`
        INSERT INTO village_admin_audit_log (
          village_id, sub_village_admin_id, sub_village_admin_name, designation,
          action_type, application_id, application_number, applicant_name,
          ip_address, user_agent, details, created_at
        ) VALUES (
          ${adminInfo.villageId}, ${adminInfo.subVillageAdminId}, ${subAdmin[0].full_name},
          ${designationName}, ${status === 'approved' ? 'APPROVE_APPLICATION' : 'REJECT_APPLICATION'},
          ${applicationId}::uuid, ${result[0].application_number}, ${result[0].applicant_name},
          ${ipAddress}, ${userAgent},
          ${JSON.stringify({ status, adminNotes: adminNotes || null })},
          NOW()
        )
      `;

      await sql`COMMIT`;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Application not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Application ${result[0].application_number} has been ${status}`
        })
      };

    } catch (transactionError) {
      await sql`ROLLBACK`;
      console.error('Transaction error during status update:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('Update application status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update application status',
        details: error.message 
      })
    };
  }
};
