import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { requireSuperAdmin } from './utils/auth-middleware.js';

// Generate transaction hash
const generateTransactionHash = (data) => {
  return crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
};

// Generate admin signature
const generateAdminSignature = (data, adminId) => {
  const secretKey = process.env.ADMIN_SIGNATURE_SECRET || 'default-secret-key';
  return crypto.createHmac('sha512', secretKey)
    .update(JSON.stringify({ ...data, adminId }))
    .digest('hex');
};

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Verify super admin authentication
    const authResult = requireSuperAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const adminInfo = authResult.user;
    const { userId, amount, reason } = JSON.parse(event.body);

    if (!userId || !amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid user ID and positive amount are required' })
      };
    }

    if (!reason || reason.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Reason is required for point creation' })
      };
    }

    // Start transaction
    await sql`BEGIN`;

    try {
      // Get user current balance (with row lock)
      const user = await sql`
        SELECT id, username, point_balance 
        FROM users 
        WHERE id = ${userId} AND role = 'applicant'
        FOR UPDATE
      `;

      if (user.length === 0) {
        await sql`ROLLBACK`;
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      const currentBalance = user[0].point_balance || 0;
      const newBalance = currentBalance + amount;

      // Create transaction data for hash and signature
      const transactionData = {
        userId,
        amount,
        previousBalance: currentBalance,
        newBalance,
        timestamp: Date.now(),
        reason: reason.trim()
      };

      const transactionHash = generateTransactionHash(transactionData);
      const adminSignature = generateAdminSignature(transactionData, adminInfo.id);

      // Insert transaction record
      await sql`
        INSERT INTO point_transactions (
          transaction_hash, user_id, admin_id, type, amount,
          previous_balance, new_balance, reason, admin_signature, admin_ip
        )
        VALUES (
          ${transactionHash}, ${userId}, ${adminInfo.id}, 'CREATE', ${amount},
          ${currentBalance}, ${newBalance}, ${reason.trim()}, ${adminSignature},
          ${event.headers['x-forwarded-for'] || 'unknown'}
        )
      `;

      // Update user balance
      await sql`
        UPDATE users 
        SET point_balance = ${newBalance}
        WHERE id = ${userId}
      `;

      // Log in audit trail
      await sql`
        INSERT INTO admin_audit_log (admin_id, action, details, ip_address)
        VALUES (
          ${adminInfo.id}, 
          'POINTS_CREATED', 
          ${JSON.stringify({ 
            targetUserId: userId, 
            targetUsername: user[0].username,
            amount, 
            reason: reason.trim(),
            previousBalance: currentBalance,
            newBalance 
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'}
        )
      `;

      await sql`COMMIT`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Points created successfully',
          transaction: {
            hash: transactionHash,
            amount,
            previousBalance: currentBalance,
            newBalance,
            reason: reason.trim(),
            createdAt: new Date().toISOString()
          }
        })
      };

    } catch (transactionError) {
      await sql`ROLLBACK`;
      throw transactionError;
    }

  } catch (error) {
    console.error('Create points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create points. Please try again.' })
    };
  }
};
