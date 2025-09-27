import { neon } from '@neondatabase/serverless';
import { requireRole } from './utils/auth-middleware.js';
import { checkRateLimit } from './utils/voucher-config.js';

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
    
    // Rate limiting check
    const rateLimitResult = checkRateLimit(`voucher_track_${adminId}`, 20, 3600000);
    if (!rateLimitResult.allowed) {
      return {
        statusCode: 429,
        headers: {
          ...headers,
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        },
        body: JSON.stringify({ 
          error: 'Rate limit exceeded for voucher tracking.',
          resetTime: rateLimitResult.resetTime
        })
      };
    }
    
    const { status, searchTerm, dateFrom, dateTo, limit = 50 } = event.queryStringParameters || {};

   // Get voucher data from dedicated vouchers table
    let voucherQuery = `
      SELECT 
        v.id,
        v.voucher_code,
        v.point_value,
        v.monetary_value,
        v.status,
        v.generated_at,
        v.redeemed_at,
        v.expires_at,
        v.administrative_notes,
        u.username as target_username,
        u.email as target_email,
        u.full_name as target_full_name,
        u.role as target_role,
        admin.username as generated_by_username,
        admin.role as generated_by_role
      FROM vouchers v
      JOIN users u ON v.target_user_id = u.id
      JOIN users admin ON v.generated_by = admin.id
      WHERE v.generated_by = $1
    `;

    const params = [adminId];
    let paramIndex = 2;

   // Apply filters
    if (status && ['active', 'redeemed', 'expired', 'cancelled'].includes(status)) {
      voucherQuery += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

  if (searchTerm) {
      voucherQuery += ` AND (
        v.voucher_code ILIKE $${paramIndex} OR
        u.username ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.full_name ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (dateFrom) {
      voucherQuery += ` AND v.generated_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      voucherQuery += ` AND v.generated_at <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    voucherQuery += ` ORDER BY v.generated_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const vouchers = await sql(voucherQuery, params);

  // Get quota information from admin_voucher_quotas table
    const quotaInfo = await sql`
      SELECT 
        active_voucher_count,
        total_generated,
        last_generation_timestamp
      FROM admin_voucher_quotas
      WHERE admin_id = ${adminId}
    `;

    // Get summary statistics from vouchers table
    const summaryStats = await sql`
      SELECT 
        COUNT(*) as total_vouchers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_vouchers,
        COUNT(CASE WHEN status = 'redeemed' THEN 1 END) as redeemed_vouchers,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_vouchers,
        COALESCE(SUM(CASE WHEN status = 'redeemed' THEN point_value ELSE 0 END), 0) as total_points_redeemed,
        COALESCE(SUM(CASE WHEN status = 'active' THEN point_value ELSE 0 END), 0) as pending_point_value
      FROM vouchers
      WHERE generated_by = ${adminId}
    `;

    const currentQuota = quotaInfo.length > 0 ? quotaInfo[0] : { active_voucher_count: 0, total_generated: 0, last_generation_timestamp: null };

   return {
      statusCode: 200,
      headers: {
        ...headers,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
      },
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
          used: currentQuota.active_voucher_count,
          total: 5,
          remaining: Math.max(5 - currentQuota.active_voucher_count, 0),
          totalGenerated: currentQuota.total_generated,
          lastGeneration: currentQuota.last_generation_timestamp
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
