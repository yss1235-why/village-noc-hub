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
    // Get user's recent applications (last 10 minutes)
    const recentApplications = await sql`
      SELECT application_number, created_at, status
      FROM noc_applications 
      WHERE user_id = ${userInfo.id} 
      AND created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
    `;

    // Get recent point transactions (last 10 minutes)
    const recentTransactions = await sql`
      SELECT type, amount, created_at, application_id
      FROM point_transactions 
      WHERE user_id = ${userInfo.id} 
      AND created_at > NOW() - INTERVAL '10 minutes'
      AND type = 'DEDUCT'
      ORDER BY created_at DESC
    `;

    // Check if points were deducted without corresponding application
    let pointsDeductedWithoutApp = false;
    
    if (recentTransactions.length > 0 && recentApplications.length === 0) {
      pointsDeductedWithoutApp = true;
    }

    // Check for orphaned transactions (deduction without matching application)
    for (const transaction of recentTransactions) {
      if (transaction.application_id) {
        const appExists = recentApplications.find(app => 
          app.application_number.includes(transaction.application_id) ||
          app.created_at.getTime() === new Date(transaction.created_at).getTime()
        );
        
        if (!appExists) {
          pointsDeductedWithoutApp = true;
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        recentApplications,
        recentTransactions,
        pointsDeductedWithoutApp,
        currentBalance: userInfo.pointBalance
      })
    };

  } catch (error) {
    console.error('Check submission status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check submission status' })
    };
  }
};
