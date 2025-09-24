import { neon } from '@neondatabase/serverless';
import { requireApprovedUser } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const authResult = requireApprovedUser(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const userInfo = authResult.user;

    // Get current balance
    const user = await sql`
      SELECT point_balance, full_name, username
      FROM users 
      WHERE id = ${userInfo.id}
    `;

    if (user.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Get transaction history
    const transactions = await sql`
      SELECT 
        transaction_hash, type, amount, previous_balance, 
        new_balance, reason, created_at, application_id
      FROM point_transactions 
      WHERE user_id = ${userInfo.id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          name: user[0].full_name,
          username: user[0].username,
          currentBalance: user[0].point_balance
        },
        transactions: transactions.map(tx => ({
          hash: tx.transaction_hash,
          type: tx.type,
          amount: tx.amount,
          previousBalance: tx.previous_balance,
          newBalance: tx.new_balance,
          reason: tx.reason,
          date: tx.created_at,
          applicationId: tx.application_id
        }))
      })
    };

  } catch (error) {
    console.error('Get user points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get point information' })
    };
  }
};
