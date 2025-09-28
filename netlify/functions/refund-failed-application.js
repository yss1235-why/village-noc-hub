import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { requireApprovedUser } from './utils/auth-middleware.js';

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

  // Check authentication
  const authResult = await requireApprovedUser(event);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  const userInfo = authResult.user;

  try {
    await sql`BEGIN`;

    // Find recent point deductions without corresponding applications
    const recentDeductions = await sql`
      SELECT pt.id, pt.amount, pt.previous_balance, pt.application_id
      FROM point_transactions pt
      WHERE pt.user_id = ${userInfo.id} 
      AND pt.type = 'DEDUCT'
      AND pt.created_at > NOW() - INTERVAL '10 minutes'
      AND pt.amount = -15
      ORDER BY pt.created_at DESC
      LIMIT 1
    `;

    if (recentDeductions.length === 0) {
      await sql`ROLLBACK`;
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No recent deduction found to refund' })
      };
    }

    const deduction = recentDeductions[0];

    // Get current user balance
    const currentUser = await sql`
      SELECT point_balance FROM users WHERE id = ${userInfo.id}
    `;

    const currentBalance = currentUser[0].point_balance;
    const refundAmount = 15; // Amount to refund
    const newBalance = currentBalance + refundAmount;

    // Create refund transaction
    const transactionHash = crypto.createHash('sha256')
      .update(`${userInfo.id}-refund-${Date.now()}`)
      .digest('hex');

    await sql`
      INSERT INTO point_transactions (
        transaction_hash, user_id, type, amount, previous_balance, new_balance,
        reason, admin_ip
      )
      VALUES (
        ${transactionHash}, ${userInfo.id}, 'REFUND', ${refundAmount}, ${currentBalance}, ${newBalance},
        'Failed application refund', ${event.headers['x-forwarded-for'] || 'system'}
      )
    `;

    // Update user balance
    await sql`UPDATE users SET point_balance = ${newBalance} WHERE id = ${userInfo.id}`;

    // Mark the original deduction as refunded (add note)
    await sql`
      UPDATE point_transactions 
      SET reason = reason || ' (REFUNDED)' 
      WHERE id = ${deduction.id}
    `;

    await sql`COMMIT`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Refund processed successfully',
        refundAmount,
        newBalance,
        transactionHash
      })
    };

  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Refund failed application error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process refund' })
    };
  }
};
