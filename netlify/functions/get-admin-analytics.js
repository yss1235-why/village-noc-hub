import { neon } from '@neondatabase/serverless';
import { requireMinimumRole } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
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

  const authResult = requireMinimumRole(event, 'village_admin');
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  try {
    const urlParams = new URL(`https://example.com${event.path}?${event.rawQuery || ''}`);
    const timeframe = urlParams.searchParams.get('timeframe') || '30d';
    const scope = urlParams.searchParams.get('scope') || 'system';

    // Calculate date range based on timeframe
    let dateFilter;
    switch (timeframe) {
      case '7d':
        dateFilter = 'created_at >= NOW() - INTERVAL \'7 days\'';
        break;
      case '30d':
        dateFilter = 'created_at >= NOW() - INTERVAL \'30 days\'';
        break;
      case '90d':
        dateFilter = 'created_at >= NOW() - INTERVAL \'90 days\'';
        break;
      case '1y':
        dateFilter = 'created_at >= NOW() - INTERVAL \'1 year\'';
        break;
      default:
        dateFilter = 'created_at >= NOW() - INTERVAL \'30 days\'';
    }

    // Basic system statistics
    const systemStats = await sql`
      SELECT 
        COUNT(DISTINCT v.id) as total_villages,
        COUNT(DISTINCT CASE WHEN v.status = 'approved' THEN v.id END) as active_villages,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.is_approved = true THEN u.id END) as approved_users,
        COUNT(DISTINCT a.id) as total_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as approved_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'rejected' THEN a.id END) as rejected_applications
      FROM villages v
      CROSS JOIN users u
      CROSS JOIN applications a
    `;

    // Application trends over time
    const applicationTrends = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as applications,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM applications
      WHERE ${sql.raw(dateFilter)}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Village performance metrics
    const villagePerformance = await sql`
      SELECT 
        v.name as village_name,
        v.district,
        COUNT(a.id) as total_applications,
        COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_applications,
        COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_applications,
        ROUND(
          CASE 
            WHEN COUNT(a.id) > 0 THEN 
              (COUNT(CASE WHEN a.status = 'approved' THEN 1 END) * 100.0 / COUNT(a.id))
            ELSE 0 
          END, 2
        ) as approval_rate,
        COUNT(DISTINCT u.id) as registered_users,
        AVG(
          EXTRACT(EPOCH FROM (
            COALESCE(a.approved_at, a.rejected_at, NOW()) - a.created_at
          )) / 86400
        ) as avg_processing_days
      FROM villages v
      LEFT JOIN applications a ON v.id = a.village_id AND ${sql.raw(dateFilter.replace('created_at', 'a.created_at'))}
      LEFT JOIN users u ON v.id = u.village_id
      WHERE v.status = 'approved'
      GROUP BY v.id, v.name, v.district
      ORDER BY total_applications DESC
      LIMIT 20
    `;

    // User engagement metrics
    const userEngagement = await sql`
      SELECT 
        COUNT(DISTINCT u.id) as total_active_users,
        COUNT(DISTINCT CASE WHEN u.last_login >= NOW() - INTERVAL '7 days' THEN u.id END) as weekly_active_users,
        COUNT(DISTINCT CASE WHEN u.last_login >= NOW() - INTERVAL '30 days' THEN u.id END) as monthly_active_users,
        AVG(u.point_balance) as avg_user_points,
        COUNT(DISTINCT pt.user_id) as users_with_transactions,
        SUM(CASE WHEN pt.transaction_type = 'credit' THEN pt.amount ELSE 0 END) as total_points_awarded,
        SUM(CASE WHEN pt.transaction_type = 'debit' THEN pt.amount ELSE 0 END) as total_points_spent
      FROM users u
      LEFT JOIN point_transactions pt ON u.id = pt.user_id AND ${sql.raw(dateFilter.replace('created_at', 'pt.created_at'))}
      WHERE u.role IN ('user', 'applicant')
    `;

    // Processing time analysis
    const processingAnalysis = await sql`
      SELECT 
        AVG(
          EXTRACT(EPOCH FROM (
            COALESCE(approved_at, rejected_at) - created_at
          )) / 86400
        ) as avg_processing_days,
        MIN(
          EXTRACT(EPOCH FROM (
            COALESCE(approved_at, rejected_at) - created_at
          )) / 86400
        ) as min_processing_days,
        MAX(
          EXTRACT(EPOCH FROM (
            COALESCE(approved_at, rejected_at) - created_at
          )) / 86400
        ) as max_processing_days,
        COUNT(CASE WHEN approved_at IS NOT NULL OR rejected_at IS NOT NULL THEN 1 END) as processed_applications,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications
      FROM applications
      WHERE ${sql.raw(dateFilter)}
    `;

    // Recent activity summary
    const recentActivity = await sql`
      SELECT 
        al.action,
        COUNT(*) as count,
        MAX(al.created_at) as last_occurrence
      FROM audit_logs al
      WHERE al.created_at >= NOW() - INTERVAL '7 days'
        AND al.action IN ('APPROVE_APPLICATION', 'REJECT_APPLICATION', 'CREATE_USER', 'ADD_POINTS', 'DEDUCT_POINTS')
      GROUP BY al.action
      ORDER BY count DESC
    `;

    // Compile analytics response
    const analytics = {
      overview: {
        totalVillages: parseInt(systemStats[0].total_villages),
        activeVillages: parseInt(systemStats[0].active_villages),
        totalUsers: parseInt(systemStats[0].total_users),
        approvedUsers: parseInt(systemStats[0].approved_users),
        totalApplications: parseInt(systemStats[0].total_applications),
        approvedApplications: parseInt(systemStats[0].approved_applications),
        pendingApplications: parseInt(systemStats[0].pending_applications),
        rejectedApplications: parseInt(systemStats[0].rejected_applications),
        approvalRate: systemStats[0].total_applications > 0 
          ? ((systemStats[0].approved_applications / systemStats[0].total_applications) * 100).toFixed(2)
          : '0.00'
      },
      trends: {
        applications: applicationTrends,
        timeframe: timeframe
      },
      performance: {
        villages: villagePerformance,
        processing: {
          avgProcessingDays: parseFloat(processingAnalysis[0].avg_processing_days || 0).toFixed(1),
          minProcessingDays: parseFloat(processingAnalysis[0].min_processing_days || 0).toFixed(1),
          maxProcessingDays: parseFloat(processingAnalysis[0].max_processing_days || 0).toFixed(1),
          processedApplications: parseInt(processingAnalysis[0].processed_applications),
          pendingApplications: parseInt(processingAnalysis[0].pending_applications)
        }
      },
      engagement: {
        totalActiveUsers: parseInt(userEngagement[0].total_active_users || 0),
        weeklyActiveUsers: parseInt(userEngagement[0].weekly_active_users || 0),
        monthlyActiveUsers: parseInt(userEngagement[0].monthly_active_users || 0),
        avgUserPoints: parseFloat(userEngagement[0].avg_user_points || 0).toFixed(2),
        usersWithTransactions: parseInt(userEngagement[0].users_with_transactions || 0),
        totalPointsAwarded: parseInt(userEngagement[0].total_points_awarded || 0),
        totalPointsSpent: parseInt(userEngagement[0].total_points_spent || 0)
      },
      recentActivity: recentActivity,
      generatedAt: new Date().toISOString(),
      scope: scope,
      timeframe: timeframe
    };

    // Log analytics access
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'VIEW_ANALYTICS', 'analytics',
        ${JSON.stringify({ 
          scope: scope, 
          timeframe: timeframe, 
          adminRole: authResult.user.role 
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
        analytics: analytics
      })
    };

  } catch (error) {
    console.error('Get admin analytics error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate analytics data' })
    };
  }
};
