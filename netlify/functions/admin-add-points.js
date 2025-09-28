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

  // Only system_admin and super_admin can add points
  const authResult = requireMinimumRole(event, 'system_admin');
  if (!authResult.isValid) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Insufficient permissions. Only system admins can add points.' })
    };
  }

  try {
    const { userId, amount, reason } = JSON.parse(event.body);
    
    // Input validation
    if (!userId || !amount || !reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID, amount, and reason are required' })
      };
    }

    if (![500, 1000].includes(parseInt(amount))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be exactly 500 or 1000 points' })
      };
    }

    if (reason.trim().length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Reason must be at least 5 characters long' })
      };
    }

    const adminIp = event.headers['x-forwarded-for'] || '127.0.0.1';

    // Use secure database function
    const result = await sql`
      SELECT secure_admin_add_points(
        ${authResult.user.id}::UUID,
        ${userId}::UUID,
        ${parseInt(amount)}::INTEGER,
        ${reason.trim()}::TEXT,
        ${adminIp}::INET
      ) as result
    `;

    const operationResult = result[0].result;

    if (!operationResult.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: operationResult.error,
          details: operationResult
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${amount} points successfully added to user account`,
        transaction: operationResult
      })
    };

  } catch (error) {
    console.error('Admin add points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to add points' })
    };
  }
};
