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
    // Get fraud detection settings
    const fraudSettings = await sql`
      SELECT setting_name, setting_value
      FROM system_settings
      WHERE setting_category = 'fraud_detection'
    `;

    const settings = {};
    fraudSettings.forEach(setting => {
      let value = setting.setting_value;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = Number(value);
      settings[setting.setting_name] = value;
    });

    const alertThreshold = settings.alertThreshold || 5;
    const suspiciousLoginLimit = settings.suspiciousLoginAttempts || 3;
    const maxDailyApplications = settings.maxDailyApplications || 10;

    // Detect suspicious login patterns
    const suspiciousLogins = await sql`
      SELECT 
        user_id,
        COUNT(*) as failed_attempts,
        MAX(created_at) as last_attempt,
        STRING_AGG(DISTINCT ip_address, ', ') as ip_addresses
      FROM security_logs
      WHERE action = 'FAILED_LOGIN' 
        AND created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY user_id
      HAVING COUNT(*) >= ${suspiciousLoginLimit}
      ORDER BY failed_attempts DESC
    `;

    // Detect unusual application volumes
    const suspiciousApplications = await sql`
      SELECT 
        a.user_id,
        u.name,
        u.email,
        COUNT(*) as daily_applications,
        MIN(a.created_at) as first_application,
        MAX(a.created_at) as last_application
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.created_at >= CURRENT_DATE
      GROUP BY a.user_id, u.name, u.email
      HAVING COUNT(*) >= ${maxDailyApplications}
      ORDER BY daily_applications DESC
    `;

    // Detect duplicate applications
    const duplicateApplications = await sql`
      SELECT 
        applicant_name,
        father_name,
        address,
        COUNT(*) as duplicate_count,
        STRING_AGG(application_number, ', ') as application_numbers,
        MIN(created_at) as first_submitted,
        MAX(created_at) as last_submitted
      FROM applications
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY applicant_name, father_name, address
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `;

    // Detect rapid status changes
    const rapidStatusChanges = await sql`
      SELECT 
        resource_id as application_id,
        COUNT(*) as status_changes,
        STRING_AGG(action, ' -> ') as change_pattern,
        MIN(created_at) as first_change,
        MAX(created_at) as last_change
      FROM audit_logs
      WHERE action IN ('APPROVE_APPLICATION', 'REJECT_APPLICATION')
        AND created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY resource_id
      HAVING COUNT(*) >= 3
      ORDER BY status_changes DESC
    `;

    // Compile fraud alerts
    const alerts = [];

    // Add suspicious login alerts
    for (const login of suspiciousLogins) {
      const user = await sql`
        SELECT name, email FROM users WHERE id = ${login.user_id}
      `;

      alerts.push({
        id: `login-${login.user_id}`,
        type: 'suspicious_login',
        severity: 'high',
        title: 'Multiple Failed Login Attempts',
        message: `User ${user[0]?.name || 'Unknown'} has ${login.failed_attempts} failed login attempts in the last hour`,
        details: {
          userId: login.user_id,
          userName: user[0]?.name,
          userEmail: user[0]?.email,
          failedAttempts: login.failed_attempts,
          lastAttempt: login.last_attempt,
          ipAddresses: login.ip_addresses
        },
        timestamp: login.last_attempt,
        status: 'active'
      });
    }

    // Add suspicious application alerts
    for (const app of suspiciousApplications) {
      alerts.push({
        id: `apps-${app.user_id}`,
        type: 'suspicious_applications',
        severity: 'warning',
        title: 'Unusual Application Volume',
        message: `${app.name} has submitted ${app.daily_applications} applications today`,
        details: {
          userId: app.user_id,
          userName: app.name,
          userEmail: app.email,
          applicationCount: app.daily_applications,
          timeSpan: {
            first: app.first_application,
            last: app.last_application
          }
        },
        timestamp: app.last_application,
        status: 'active'
      });
    }

    // Add duplicate application alerts
    for (const dup of duplicateApplications) {
      alerts.push({
        id: `dup-${dup.applicant_name.replace(/\s+/g, '-').toLowerCase()}`,
        type: 'duplicate_applications',
        severity: 'warning',
        title: 'Potential Duplicate Applications',
        message: `${dup.duplicate_count} applications found for ${dup.applicant_name}`,
        details: {
          applicantName: dup.applicant_name,
          fatherName: dup.father_name,
          address: dup.address,
          duplicateCount: dup.duplicate_count,
          applicationNumbers: dup.application_numbers,
          timeSpan: {
            first: dup.first_submitted,
            last: dup.last_submitted
          }
        },
        timestamp: dup.last_submitted,
        status: 'active'
      });
    }

    // Add rapid status change alerts
    for (const change of rapidStatusChanges) {
      alerts.push({
        id: `status-${change.application_id}`,
        type: 'rapid_status_changes',
        severity: 'critical',
        title: 'Rapid Application Status Changes',
        message: `Application ${change.application_id} had ${change.status_changes} status changes in 24 hours`,
        details: {
          applicationId: change.application_id,
          statusChanges: change.status_changes,
          changePattern: change.change_pattern,
          timeSpan: {
            first: change.first_change,
            last: change.last_change
          }
        },
        timestamp: change.last_change,
        status: 'active'
      });
    }

    // Sort alerts by severity and timestamp
    alerts.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'warning': 2, 'low': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Log the fraud monitoring access
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'VIEW_FRAUD_ALERTS', 'fraud_monitoring',
        ${JSON.stringify({ alertCount: alerts.length, adminRole: authResult.user.role })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        alerts: alerts,
        alertCount: alerts.length,
        settings: {
          enabled: settings.enabled !== false,
          alertThreshold: alertThreshold,
          monitoringActive: true
        },
        lastUpdated: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Get fraud alerts error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve fraud detection alerts' })
    };
  }
};
