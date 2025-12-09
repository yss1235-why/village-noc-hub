import { neon } from '@neondatabase/serverless';
import { requireVillageAdmin } from './utils/auth-middleware.js';

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

  // Authenticate
  const authResult = requireVillageAdmin(event);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  const userInfo = authResult.user;

  try {
    const { month, year, format, actionType, subVillageAdminId } = event.queryStringParameters || {};

    // Default to current month/year
    const now = new Date();
    const targetMonth = parseInt(month) || (now.getMonth() + 1);
    const targetYear = parseInt(year) || now.getFullYear();

    // Calculate date range
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Build query conditions
    let logs;
    if (actionType && subVillageAdminId) {
      logs = await sql`
        SELECT 
          val.id,
          val.sub_village_admin_name,
          val.designation,
          val.action_type,
          val.application_number,
          val.applicant_name,
          val.ip_address,
          val.created_at,
          val.details
        FROM village_admin_audit_log val
        WHERE val.village_id = ${userInfo.villageId}
          AND val.created_at >= ${startDate.toISOString()}
          AND val.created_at <= ${endDate.toISOString()}
          AND val.action_type = ${actionType}
          AND val.sub_village_admin_id = ${subVillageAdminId}
        ORDER BY val.created_at DESC
      `;
    } else if (actionType) {
      logs = await sql`
        SELECT 
          val.id,
          val.sub_village_admin_name,
          val.designation,
          val.action_type,
          val.application_number,
          val.applicant_name,
          val.ip_address,
          val.created_at,
          val.details
        FROM village_admin_audit_log val
        WHERE val.village_id = ${userInfo.villageId}
          AND val.created_at >= ${startDate.toISOString()}
          AND val.created_at <= ${endDate.toISOString()}
          AND val.action_type = ${actionType}
        ORDER BY val.created_at DESC
      `;
    } else if (subVillageAdminId) {
      logs = await sql`
        SELECT 
          val.id,
          val.sub_village_admin_name,
          val.designation,
          val.action_type,
          val.application_number,
          val.applicant_name,
          val.ip_address,
          val.created_at,
          val.details
        FROM village_admin_audit_log val
        WHERE val.village_id = ${userInfo.villageId}
          AND val.created_at >= ${startDate.toISOString()}
          AND val.created_at <= ${endDate.toISOString()}
          AND val.sub_village_admin_id = ${subVillageAdminId}
        ORDER BY val.created_at DESC
      `;
    } else {
      logs = await sql`
        SELECT 
          val.id,
          val.sub_village_admin_name,
          val.designation,
          val.action_type,
          val.application_number,
          val.applicant_name,
          val.ip_address,
          val.created_at,
          val.details
        FROM village_admin_audit_log val
        WHERE val.village_id = ${userInfo.villageId}
          AND val.created_at >= ${startDate.toISOString()}
          AND val.created_at <= ${endDate.toISOString()}
        ORDER BY val.created_at DESC
      `;
    }

    // Get village info for report header
    const village = await sql`
      SELECT name, district, state FROM villages WHERE id = ${userInfo.villageId}
    `;

    // If Excel format requested, generate CSV (frontend will convert to Excel)
    if (format === 'excel' || format === 'csv') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      
      // CSV Header with village info
      let csv = `Audit Log Report\n`;
      csv += `Village: ${village[0]?.name || 'Unknown'}\n`;
      csv += `District: ${village[0]?.district || 'Unknown'}\n`;
      csv += `Period: ${monthNames[targetMonth - 1]} ${targetYear}\n`;
      csv += `Generated: ${new Date().toISOString()}\n\n`;
      
      // Column headers
      csv += `Sub Village Admin Name,Designation,Action Type,Application Number,Applicant Name,Timestamp,IP Address\n`;
      
      // Data rows
      logs.forEach(log => {
        const timestamp = new Date(log.created_at).toLocaleString();
        csv += `"${log.sub_village_admin_name}","${log.designation}","${log.action_type}","${log.application_number || ''}","${log.applicant_name || ''}","${timestamp}","${log.ip_address || ''}"\n`;
      });

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${targetYear}-${targetMonth.toString().padStart(2, '0')}.csv"`
        },
        body: csv
      };
    }

    // JSON response for display
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        village: village[0] || null,
        period: {
          month: targetMonth,
          year: targetYear
        },
        logs: logs,
        totalCount: logs.length,
        summary: {
          totalLogins: logs.filter(l => l.action_type === 'LOGIN').length,
          totalApprovals: logs.filter(l => l.action_type === 'APPROVE_APPLICATION').length,
          totalRejections: logs.filter(l => l.action_type === 'REJECT_APPLICATION').length
        }
      })
    };

  } catch (error) {
    console.error('Get audit log error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch audit log' })
    };
  }
};
