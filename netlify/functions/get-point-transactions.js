import { neon } from '@neondatabase/serverless';
import { requireApprovedUser } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const authResult = await requireApprovedUser(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const userId = authResult.user.id;
    const { type, startDate, endDate, limit = 100 } = event.queryStringParameters || {};

    let query = `
      SELECT 
        pt.id,
        pt.type,
        pt.amount,
        pt.previous_balance,
        pt.new_balance,
        pt.reason,
        pt.created_at,
        pt.admin_ip,
        pt.application_id,
        na.application_number
      FROM point_transactions pt
      LEFT JOIN noc_applications na ON pt.application_id = na.id
      WHERE pt.user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;

    if (type && (type === 'ADD' || type === 'DEDUCT')) {
      query += ` AND pt.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND pt.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND pt.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY pt.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const transactions = await sql(query, params);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        transactions: transactions || [],
        totalCount: transactions.length
      })
    };

  } catch (error) {
    console.error('Get point transactions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch point transactions' })
    };
  }
};
