import { neon } from '@neondatabase/serverless';
import { requireMinimumRole, requireSystemAdmin } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
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

 // Try village admin first, then system admin
  let authResult = requireMinimumRole(event, 'village_admin');
  if (!authResult.isValid) {
    authResult = requireSystemAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions. Admin access required.' })
      };
    }
  }

  try {
   const { userId, amount, reason } = JSON.parse(event.body);
    const adminId = authResult.user.id;

    if (!userId || !amount || !reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID, amount, and reason are required' })
      };
    }

    if (amount <= 0 || amount > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be between 1 and 1000 points' })
      };
    }
// Get user details and verify access permissions
    const user = await sql`
      SELECT u.id, u.full_name as name, u.email, u.point_balance, u.village_id, v.name as village_name
      FROM users u
      LEFT JOIN villages v ON u.village_id = v.id
      WHERE u.id = ${userId} AND u.is_approved = true
    `;
    if (user.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found or not approved' })
      };
    }

    const targetUser = user[0];

   // Village admin can only manage users in their village (system admin can manage all)
    if (authResult.user.role === 'village_admin') {
      if (targetUser.village_id !== authResult.user.villageId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'You can only manage users in your village' })
        };
      }
    }
    // System admin can manage all users - no village restriction

    // Get current balance first
    const currentBalance = targetUser.point_balance || 0;
    const newBalance = currentBalance + amount;

   // Generate transaction hash
    const crypto = require('crypto');
    const transactionData = {
      userId,
      amount,
      previousBalance: currentBalance,
      newBalance,
      timestamp: Date.now(),
      reason
    };
    const transactionHash = crypto.createHash('sha256').update(JSON.stringify(transactionData)).digest('hex');

    // Update user point balance first
    await sql`
      UPDATE users 
      SET point_balance = COALESCE(point_balance, 0) + ${amount}
      WHERE id = ${userId}
    `;

    // Create simplified point transaction record
    try {
      await sql`
        INSERT INTO point_transactions (
          user_id, transaction_type, amount, description, 
          created_by, ip_address, created_at
        ) VALUES (
          ${userId}, 'credit', ${amount}, ${reason},
          ${adminId}, ${event.headers['x-forwarded-for'] || 'unknown'}, NOW()
        )
      `;
    } catch (transactionError) {
      console.log('Point transaction logging failed:', transactionError.message);
      // Continue execution - don't fail the entire operation for logging issues
    }

    // Log the action for audit purposes
    try {
      await sql`
        INSERT INTO admin_audit_log (
          admin_id, action, details, ip_address
        ) VALUES (
          ${adminId}, 'ADD_POINTS',
          ${JSON.stringify({ 
            targetUserId: userId,
            targetUserName: targetUser.name,
            pointsAdded: amount,
            reason: reason,
            newBalance: newBalance,
            village: targetUser.village_name
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'}
        )
      `;
   } catch (auditError) {
      console.log('Audit logging failed:', auditError.message);
      // Continue execution - don't fail the entire operation for audit logging issues
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${amount} points added to ${targetUser.name} successfully`,
      newBalance: newBalance,
        transaction: {
          userId: userId,
          amount: amount,
          reason: reason,
          type: 'credit'
        }
      })
    };

  } catch (error) {
    console.error('Add points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to add points to user account' })
    };
  }
};
