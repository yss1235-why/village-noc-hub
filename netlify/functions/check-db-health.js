import { neon } from '@neondatabase/serverless';
import { requireSuperAdmin } from './utils/auth-middleware.js';

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

  const authResult = requireSuperAdmin(event);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  try {
    const healthCheck = {
      database_connection: 'connected',
      tables_status: {},
      indexes_status: {},
      settings_status: {},
      data_integrity: {},
      timestamp: new Date().toISOString()
    };

    // Check core tables existence and record counts
    const coreTableChecks = [
      'users', 'villages', 'applications', 'admin_messages', 'message_recipients',
      'system_settings', 'security_logs', 'audit_logs', 'point_transactions', 'admin_permissions'
    ];

    for (const tableName of coreTableChecks) {
      try {
        const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        healthCheck.tables_status[tableName] = {
          exists: true,
          record_count: parseInt(countResult[0].count),
          status: 'healthy'
        };
      } catch (error) {
        healthCheck.tables_status[tableName] = {
          exists: false,
          error: error.message,
          status: 'missing'
        };
      }
    }

    // Check critical indexes
    const indexChecks = await sql`
      SELECT schemaname, tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('users', 'applications', 'admin_messages', 'security_logs', 'audit_logs', 'point_transactions')
      ORDER BY tablename, indexname
    `;

    healthCheck.indexes_status = {
      total_indexes: indexChecks.length,
      indexes_by_table: indexChecks.reduce((acc, idx) => {
        if (!acc[idx.tablename]) acc[idx.tablename] = [];
        acc[idx.tablename].push({
          name: idx.indexname,
          definition: idx.indexdef
        });
        return acc;
      }, {})
    };

    // Check system settings
    const settingsCheck = await sql`
      SELECT setting_category, COUNT(*) as setting_count
      FROM system_settings
      GROUP BY setting_category
      ORDER BY setting_category
    `;

    healthCheck.settings_status = {
      categories: settingsCheck.reduce((acc, setting) => {
        acc[setting.setting_category] = parseInt(setting.setting_count);
        return acc;
      }, {}),
      total_settings: settingsCheck.reduce((sum, setting) => sum + parseInt(setting.setting_count), 0)
    };

    // Check data integrity
    const integrityChecks = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'super_admin') as super_admin_count,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as system_admin_count,
        (SELECT COUNT(*) FROM users WHERE role = 'village_admin') as village_admin_count,
        (SELECT COUNT(*) FROM villages WHERE status = 'approved') as approved_villages,
        (SELECT COUNT(*) FROM applications WHERE status = 'pending') as pending_applications,
        (SELECT COUNT(*) FROM admin_messages WHERE created_at >= NOW() - INTERVAL '30 days') as recent_messages
    `;

    healthCheck.data_integrity = {
      admin_accounts: {
        super_admins: parseInt(integrityChecks[0].super_admin_count),
        system_admins: parseInt(integrityChecks[0].system_admin_count),
        village_admins: parseInt(integrityChecks[0].village_admin_count)
      },
      operational_data: {
        approved_villages: parseInt(integrityChecks[0].approved_villages),
        pending_applications: parseInt(integrityChecks[0].pending_applications),
        recent_messages: parseInt(integrityChecks[0].recent_messages)
      }
    };

    // Determine overall health status
    const missingTables = Object.values(healthCheck.tables_status).filter(table => !table.exists);
    const healthStatus = missingTables.length === 0 ? 'healthy' : 'degraded';

    healthCheck.overall_status = healthStatus;
    healthCheck.issues = missingTables.length > 0 ? {
      missing_tables: missingTables.length,
      requires_migration: true
    } : null;

    // Log health check access
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'DB_HEALTH_CHECK', 'database',
        ${JSON.stringify({ status: healthStatus, missing_tables: missingTables.length })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        health: healthCheck
      })
    };

  } catch (error) {
    console.error('Database health check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database health check failed',
        details: error.message,
        overall_status: 'unhealthy'
      })
    };
  }
};
