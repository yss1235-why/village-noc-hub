import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { requireRole } from './utils/auth-middleware.js';

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
      // Check if voucher exists and hasn't been redeemed
      const existingVoucher = await sql`
        SELECT pt.*, u.username as target_username
        FROM point_transactions pt
        JOIN users u ON pt.user_id = u.id
        WHERE pt.reference_id = ${voucherCode.toUpperCase()}
        AND pt.transaction_type = 'voucher_generated'
        AND pt.user_id = ${userId}
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

      // Check if already redeemed
      const alreadyRedeemed = await sql`
        SELECT id FROM point_transactions
        WHERE reference_id = ${voucherCode.toUpperCase()}
        AND transaction_type = 'voucher_redeemed'
        AND user_id = ${userId}
      `;

      if (alreadyRedeemed.length > 0) {
        await sql`ROLLBACK`;
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Voucher has already been redeemed' })
        };
      }

      const voucherData = existingVoucher[0];
      const pointValue = voucherData.amount;

      // Get current user balance
      const userBalance = await sql`
        SELECT point_balance FROM users WHERE id = ${userId}
      `;

      const currentBalance = userBalance[0].point_balance || 0;
      const newBalance = currentBalance + pointValue;

      // Create redemption transaction
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
        headers,
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
