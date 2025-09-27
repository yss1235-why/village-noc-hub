import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { requireRole } from './utils/auth-middleware.js';
import { validateVoucherConfig } from './utils/voucher-config.js';

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
    // Validate environment configuration
    const config = validateVoucherConfig();
    
    // Verify admin privileges (super_admin or admin only)
    const authResult = requireRole(event, 'admin');
    if (!authResult.isValid || !['admin', 'super_admin'].includes(authResult.user.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient privileges. System Admin or Super Admin access required.' })
      };
    }

   const adminId = authResult.user.id;
    const adminRole = authResult.user.role;
    
  // Check current quota using admin_voucher_quotas table
    const quotaCheck = await sql`
      SELECT active_voucher_count
      FROM admin_voucher_quotas
      WHERE admin_id = ${adminId}
    `;

    const currentActiveCount = quotaCheck.length > 0 ? quotaCheck[0].active_voucher_count : 0;
     const maxActiveVouchers = 5; // Maximum active vouchers per admin
    if (currentActiveCount >= maxActiveVouchers) {
      return {
        statusCode: 429,
        headers: {
          ...headers,
          'X-Active-Vouchers': currentActiveCount.toString(),
          'X-Max-Vouchers': '5'
        },
        body: JSON.stringify({ 
          error: `Quota exceeded. You have ${currentActiveCount} active unredeemed vouchers. Maximum allowed: ${maxActiveVouchers}`,
          activeVouchers: currentActiveCount,
          maxVouchers: maxActiveVouchers
        })
      };
    }
    
    const { targetUserId, pointValue, administrativeNotes } = JSON.parse(event.body);

    // Input validation
    if (!targetUserId || !pointValue) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Target user ID and point value are required' })
      };
    }

    if (pointValue < 500) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Minimum voucher value is 500 points' })
      };
    }

    // Verify target user exists and has correct role
    const targetUser = await sql`
      SELECT id, username, email, full_name, is_approved, role
      FROM users 
      WHERE id = ${targetUserId} 
      AND is_approved = true 
      AND role IN ('user', 'applicant')
    `;

    if (targetUser.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Target user not found, not approved, or invalid role for voucher redemption' })
      };
    }

    await sql`BEGIN`;

    try {
      // Generate cryptographically secure voucher code
      const randomBytes = crypto.randomBytes(16);
      const timestamp = Date.now().toString();
      const userBinding = crypto.createHash('sha256')
        .update(targetUserId + adminId + timestamp)
        .digest('hex')
        .substring(0, 8);
      const voucherCode = `VCH${timestamp.substring(-8)}${userBinding}${randomBytes.toString('hex').substring(0, 8)}`.toUpperCase();

   // Create cryptographic signature with HMAC
      const signatureData = {
        voucherCode,
        targetUserId,
        pointValue,
        adminId,
        timestamp: Date.now()
      };
      const signature = crypto.createHmac('sha512', config.VOUCHER_SIGNING_KEY)
        .update(JSON.stringify(signatureData))
        .digest('hex');

      // Set expiration date (30 days from generation)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

     // Insert voucher record into dedicated vouchers table
      const voucherResult = await sql`
        INSERT INTO vouchers (
          voucher_code, target_user_id, point_value, monetary_value,
          generated_by, expires_at, cryptographic_signature, administrative_notes
        )
        VALUES (
          ${voucherCode}, ${targetUserId}, ${pointValue}, ${pointValue},
          ${adminId}, ${expirationDate}, ${signature}, ${administrativeNotes || ''}
        )
        RETURNING id, generated_at
      `;

      // Update admin quota tracking
      await sql`
        INSERT INTO admin_voucher_quotas (admin_id, active_voucher_count, total_generated, last_generation_timestamp)
        VALUES (${adminId}, 1, 1, NOW())
        ON CONFLICT (admin_id) 
        DO UPDATE SET 
          active_voucher_count = admin_voucher_quotas.active_voucher_count + 1,
          total_generated = admin_voucher_quotas.total_generated + 1,
          last_generation_timestamp = NOW(),
          updated_at = NOW()
      `;

      // Create audit log entry
      await sql`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, details,
          ip_address, user_agent
        )
        VALUES (
          ${adminId}, 'VOUCHER_GENERATED', 'voucher', ${voucherResult[0].id},
          ${JSON.stringify({
            voucherCode: voucherCode,
            targetUser: targetUser[0].username,
            pointValue,
            monetaryValue: pointValue,
            administrativeNotes: administrativeNotes || '',
            adminRole: adminRole
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'}::inet,
          ${event.headers['user-agent'] || 'unknown'}
        )
      `;

      await sql`COMMIT`;

     return {
        statusCode: 201,
      headers: {
          ...headers,
          'X-Active-Vouchers': (currentActiveCount + 1).toString(),
          'X-Remaining-Quota': (5 - currentActiveCount - 1).toString()
        },
        body: JSON.stringify({
          success: true,
          voucher: {
            code: voucherCode,
            pointValue,
            targetUser: targetUser[0].username,
            expirationDate: expirationDate.toISOString(),
           generatedAt: voucherResult[0].generated_at
          }
        })
      };

    } catch (transactionError) {
      await sql`ROLLBACK`;
      throw transactionError;
    }

  } catch (error) {
    console.error('Voucher generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Voucher generation failed. Please try again.' })
    };
  }
};
