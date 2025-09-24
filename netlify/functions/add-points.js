import { neon } from '@neondatabase/serverless';
import { requireMinimumRole } from './utils/auth-middleware.js';

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

  const authResult = requireMinimumRole(event, 'village_admin');
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  try {
    const { userId, amount, reason, adminId } = JSON.parse(event.body);

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
      SELECT u.id, u.name, u.email, u.point_balance, u.village_id, v.name as village_name
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

    // Village admin can only manage users in their village
    if (authResult.user.role === 'village_admin') {
      if (targetUser.village_id !== authResult.user.villageId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'You can only manage users in your village' })
        };
      }
    }

    // Create point transaction record
    await sql`
      INSERT INTO point_transactions (
        user_id, transaction_type, amount, description, 
        created_by, ip_address, created_at
      ) VALUES (
        ${userId}, 'credit', ${amount}, ${reason},
        ${authResult.user.userId}, ${event.headers['x-forwarded-for'] || 'unknown'}, NOW()
      )
    `;

    // Update user point balance
    await sql`
      UPDATE users 
      SET point_balance = COALESCE(point_balance, 0) + ${amount}, updated_at = NOW()
      WHERE id = ${userId}
    `;

    // Get updated balance
    const updatedUser = await sql`
      SELECT point_balance FROM users WHERE id = ${userId}
    `;

    // Log the action for audit purposes
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'ADD_POINTS', 'user', ${userId},
        ${JSON.stringify({ 
          targetUserName: targetUser.name,
          pointsAdded: amount,
          reason: reason,
          newBalance: updatedUser[0].point_balance,
          village: targetUser.village_name
        })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${amount} points added to ${targetUser.name} successfully`,
        newBalance: updatedUser[0].point_balance,
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
