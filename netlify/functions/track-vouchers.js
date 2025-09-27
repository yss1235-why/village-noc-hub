import { neon } from '@neondatabase/serverless';
import { requireRole } from './utils/auth-middleware.js';

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
    // Verify admin privileges
    const authResult = requireRole(event, 'admin');
    if (!authResult.isValid || !['admin', 'super_admin'].includes(authResult.user.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient privileges' })
      };
    }

    const adminId = authResult.user.id;
    const { status, searchTerm, dateFrom, dateTo, limit = 50 } = event.queryStringParameters || {};

    // Get voucher data (generated vouchers)
    let voucherQuery = `
      SELECT 
        pt.id,
        pt.reference_id as voucher_code,
        pt.amount as point_value,
        pt.amount as monetary_value,
        CASE 
          WHEN redeemed.id IS NOT NULL THEN 'redeemed'
          WHEN pt.created_at < NOW() - INTERVAL '30 days' THEN 'expired'
          ELSE 'active'
        END as status,
        pt.created_at as generated_at,
        redeemed.created_at as redeemed_at,
        pt.created_at + INTERVAL '30 days' as expires_at,
        pt.description as administrative_notes,
        u.username as target_username,
        u.email as target_email,
        u.full_name as target_full_name,
        u.role as target_role,
        admin.username as generated_by_username,
        admin.role as generated_by_role
      FROM point_transactions pt
      JOIN users u ON pt.user_id = u.id
      JOIN users admin ON pt.created_by = admin.id
      LEFT JOIN point_transactions redeemed ON redeemed.reference_id = pt.reference_id 
        AND redeemed.transaction_type = 'voucher_redeemed'
      WHERE pt.transaction_type = 'voucher_generated'
      AND pt.created_by = $1
    `;

    const params = [adminId];
    let paramIndex = 2;

    // Apply filters
    if (status && ['active', 'redeemed', 'expired'].includes(status)) {
      if (status === 'redeemed') {
        voucherQuery += ` AND redeemed.id IS NOT NULL`;
      } else if (status === 'expired') {
        voucherQuery += ` AND pt.created_at < NOW() - INTERVAL '30 days' AND redeemed.id IS NULL`;
      } else if (status === 'active') {
        voucherQuery += ` AND pt.created_at >= NOW() - INTERVAL '30 days' AND redeemed.id IS NULL`;
      }
    }

    if (searchTerm) {
      voucherQuery += ` AND (
        pt.reference_id ILIKE $${paramIndex} OR
        u.username ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.full_name ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (dateFrom) {
      voucherQuery += ` AND pt.created_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      voucherQuery += ` AND pt.created_at <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    voucherQuery += ` ORDER BY pt.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const vouchers = await sql(voucherQuery, params);

    // Get quota information (simplified)
    const quotaInfo = await sql`
      SELECT 
        COUNT(*) as total_generated,
        COUNT(CASE WHEN pt.created_at >= NOW() - INTERVAL '30 days' AND redeemed.id IS NULL THEN 1 END) as active_vouchers
      FROM point_transactions pt
      LEFT JOIN point_transactions redeemed ON redeemed.reference_id = pt.reference_id 
        AND redeemed.transaction_type = 'voucher_redeemed'
      WHERE pt.transaction_type = 'voucher_generated'
      AND pt.created_by = ${adminId}
    `;

    // Get summary statistics
    const summaryStats = await sql`
      SELECT 
        COUNT(*) as total_vouchers,
        COUNT(CASE WHEN pt.created_at >= NOW() - INTERVAL '30 days' AND redeemed.id IS NULL THEN 1 END) as active_vouchers,
        COUNT(CASE WHEN redeemed.id IS NOT NULL THEN 1 END) as redeemed_vouchers,
        COUNT(CASE WHEN pt.created_at < NOW() - INTERVAL '30 days' AND redeemed.id IS NULL THEN 1 END) as expired_vouchers,
        COALESCE(SUM(CASE WHEN redeemed.id IS NOT NULL THEN pt.amount ELSE 0 END), 0) as total_points_redeemed,
        COALESCE(SUM(CASE WHEN pt.created_at >= NOW() - INTERVAL '30 days' AND redeemed.id IS NULL THEN pt.amount ELSE 0 END), 0) as pending_point_value
      FROM point_transactions pt
      LEFT JOIN point_transactions redeemed ON redeemed.reference_id = pt.reference_id 
        AND redeemed.transaction_type = 'voucher_redeemed'
      WHERE pt.transaction_type = 'voucher_generated'
      AND pt.created_by = ${adminId}
    `;

    const activeVouchersCount = Math.min(quotaInfo[0]?.active_vouchers || 0, 5);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        vouchers: vouchers.map(v => ({
          id: v.id,
          code: v.voucher_code,
          pointValue: v.point_value,
          monetaryValue: v.monetary_value,
          status: v.status,
          targetUser: {
            username: v.target_username,
            email: v.target_email,
            fullName: v.target_full_name,
            role: v.target_role
          },
          generatedAt: v.generated_at,
          redeemedAt: v.redeemed_at,
          expiresAt: v.expires_at,
          generatedBy: v.generated_by_username,
          generatedByRole: v.generated_by_role,
          administrativeNotes: v.administrative_notes
        })),
        quota: {
          used: activeVouchersCount,
          total: 5,
          remaining: Math.max(5 - activeVouchersCount, 0),
          totalGenerated: quotaInfo[0]?.total_generated || 0,
          lastGeneration: null
        },
        statistics: summaryStats[0] || {
          total_vouchers: 0,
          active_vouchers: 0,
          redeemed_vouchers: 0,
          expired_vouchers: 0,
          total_points_redeemed: 0,
          pending_point_value: 0
        }
      })
    };

  } catch (error) {
    console.error('Voucher tracking error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve voucher information' })
    };
  }
};
