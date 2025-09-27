import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { requireRole } from './utils/auth-middleware.js';
import { validateVoucherConfig, checkRateLimit } from './utils/voucher-config.js';

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
    
    // Verify user authentication and role
    const authResult = requireRole(event, 'user');
    if (!authResult.isValid || !['user', 'applicant'].includes(authResult.user.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only users and applicants can redeem vouchers' })
      };
    }

  const userId = authResult.user.id;
    const userRole = authResult.user.role;
    
   // Rate limiting check for redemption attempts
    const rateLimitResult = checkRateLimit(
      `voucher_redeem_${userId}`, 
      10, // Allow more redemption attempts than generation
      3600000 // 1 hour window for redemption attempts
    );
    
    if (!rateLimitResult.allowed) {
      return {
        statusCode: 429,
        headers: {
          ...headers,
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        },
        body: JSON.stringify({ 
          error: 'Too many redemption attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        })
      };
    }
    
    const { voucherCode } = JSON.parse(event.body);
    if (!voucherCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Voucher code is required' })
      };
    }

    await sql`BEGIN`;

    try {
     // Check if voucher exists in vouchers table
      const existingVoucher = await sql`
        SELECT v.*, u.username as target_username
        FROM vouchers v
        JOIN users u ON v.target_user_id = u.id
        WHERE v.voucher_code = ${voucherCode.toUpperCase()}
        AND v.target_user_id = ${userId}
        FOR UPDATE
      `;

      if (existingVoucher.length === 0) {
        await sql`ROLLBACK`;
        
        // Log security event for invalid voucher attempt
        await sql`
          INSERT INTO security_logs (user_id, action, details, ip_address, user_agent)
          VALUES (
            ${userId}, 'INVALID_VOUCHER_ATTEMPT',
            ${JSON.stringify({ attemptedCode: voucherCode.substring(0, 8) + '...' })},
            ${event.headers['x-forwarded-for'] || 'unknown'}::inet,
            ${event.headers['user-agent'] || 'unknown'}
          )
        `;
        
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Invalid voucher code or voucher not assigned to your account' })
        };
      }

     const voucherData = existingVoucher[0];

      // Check voucher status
      if (voucherData.status !== 'active') {
        await sql`ROLLBACK`;
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Voucher has already been ${voucherData.status}`,
            status: voucherData.status
          })
        };
      }

      // Check voucher expiration
      if (new Date(voucherData.expires_at) < new Date()) {
        await sql`ROLLBACK`;
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Voucher has expired' })
        };
      }

      const pointValue = voucherData.point_value;

      // Verify cryptographic signature
      const signatureData = {
        voucherCode: voucherData.voucher_code,
        targetUserId: voucherData.target_user_id,
        pointValue: voucherData.point_value,
        adminId: voucherData.generated_by,
        timestamp: new Date(voucherData.generated_at).getTime()
      };
      
      const expectedSignature = crypto.createHmac('sha512', config.VOUCHER_SIGNING_KEY)
        .update(JSON.stringify(signatureData))
        .digest('hex');

      // Verify signature authenticity
      if (expectedSignature !== voucherData.cryptographic_signature) {
        await sql`ROLLBACK`;
        
        // Log security event for signature verification failure
        await sql`
          INSERT INTO security_logs (user_id, action, details, ip_address, user_agent)
          VALUES (
            ${userId}, 'VOUCHER_SIGNATURE_FAILURE',
            ${JSON.stringify({ voucherCode: voucherCode.substring(0, 8) + '...' })},
            ${event.headers['x-forwarded-for'] || 'unknown'}::inet,
            ${event.headers['user-agent'] || 'unknown'}
          )
        `;
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Voucher authenticity verification failed' })
        };
      }
      // Get current user balance
      const userBalance = await sql`
        SELECT point_balance FROM users WHERE id = ${userId}
      `;

      const currentBalance = userBalance[0].point_balance || 0;
      const newBalance = currentBalance + pointValue;

     // Update voucher status to redeemed
      await sql`
        UPDATE vouchers 
        SET status = 'redeemed', 
            redeemed_at = NOW(),
            redemption_ip = ${event.headers['x-forwarded-for'] || 'unknown'}::inet,
            redemption_user_agent = ${event.headers['user-agent'] || 'unknown'},
            updated_at = NOW()
        WHERE id = ${voucherData.id}
      `;

      // Update admin quota (decrease active count)
      await sql`
        UPDATE admin_voucher_quotas
        SET active_voucher_count = GREATEST(active_voucher_count - 1, 0),
            updated_at = NOW()
        WHERE admin_id = ${voucherData.generated_by}
      `;

      // Create point transaction record for tracking
      await sql`
        INSERT INTO point_transactions (
          user_id, transaction_type, amount, description,
          reference_id, created_by, ip_address
        )
        VALUES (
          ${userId}, 'voucher_redeemed', ${pointValue},
          ${'Voucher redemption: ' + voucherCode},
          ${voucherCode.toUpperCase()}, ${userId},
          ${event.headers['x-forwarded-for'] || 'unknown'}::inet
        )
      `;

      // Update user point balance
      await sql`
        UPDATE users 
        SET point_balance = ${newBalance},
            updated_at = NOW()
        WHERE id = ${userId}
      `;

      // Create audit log entry
      await sql`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, details,
          ip_address, user_agent
        )
        VALUES (
          ${userId}, 'VOUCHER_REDEEMED', 'voucher', ${voucherData.id},
          ${JSON.stringify({
            voucherCode: voucherCode,
            pointsAdded: pointValue,
            previousBalance: currentBalance,
            newBalance: newBalance,
            redemptionMethod: 'user_interface',
            userRole: userRole
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'}::inet,
          ${event.headers['user-agent'] || 'unknown'}
        )
      `;

      await sql`COMMIT`;

      return {
        statusCode: 200,
       headers: {
          ...headers,
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-Voucher-Redeemed': 'true'
        },
        body: JSON.stringify({
          success: true,
          message: 'Voucher redeemed successfully',
          transaction: {
            pointsAdded: pointValue,
            previousBalance: currentBalance,
            newBalance: newBalance,
            voucherCode: voucherCode
          }
        })
      };

    } catch (transactionError) {
      await sql`ROLLBACK`;
      throw transactionError;
    }

  } catch (error) {
    console.error('Voucher redemption error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Voucher redemption failed. Please try again.' })
    };
  }
};
