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

      // Create cryptographic signature (simple version without environment key for now)
      const signatureData = {
        voucherCode,
        targetUserId,
        pointValue,
        adminId,
        timestamp: Date.now()
      };
      const signature = crypto.createHash('sha256')
        .update(JSON.stringify(signatureData))
        .digest('hex');

      // Set expiration date (30 days from generation)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      // Insert voucher record (using simplified schema for now)
      const voucherResult = await sql`
        INSERT INTO point_transactions (
          user_id, transaction_type, amount, description,
          reference_id, created_by, ip_address
        )
        VALUES (
          ${targetUserId}, 'voucher_generated', ${pointValue},
          ${'Voucher Code: ' + voucherCode + (administrativeNotes ? ' | Notes: ' + administrativeNotes : '')},
          ${voucherCode}, ${adminId},
          ${event.headers['x-forwarded-for'] || 'unknown'}::inet
        )
        RETURNING id, created_at
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
        headers,
        body: JSON.stringify({
          success: true,
          voucher: {
            code: voucherCode,
            pointValue,
            targetUser: targetUser[0].username,
            expirationDate: expirationDate.toISOString(),
            generatedAt: voucherResult[0].created_at
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
