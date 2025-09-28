import { neon } from '@neondatabase/serverless';
import { requireMinimumRole } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
   if (event.httpMethod === 'GET') {
      const getAllAdmins = event.queryStringParameters?.getAllAdmins === 'true';
      if (getAllAdmins) {
        const adminContacts = await sql`
          SELECT 
            acs.admin_id,
            acs.setting_key,
            acs.setting_value,
            u.role
          FROM admin_contact_settings acs
          JOIN users u ON acs.admin_id = u.id
          WHERE acs.is_active = true 
          AND u.role IN ('system_admin', 'super_admin')
          ORDER BY acs.admin_id, acs.setting_key
        `;
        const adminsByIds = {};
        adminContacts.forEach(contact => {
          if (!adminsByIds[contact.admin_id]) {
            adminsByIds[contact.admin_id] = { id: contact.admin_id, role: contact.role };
          }
          adminsByIds[contact.admin_id][contact.setting_key] = contact.setting_value;
        });
        const admins = Object.values(adminsByIds)
          .filter(admin => admin.admin_name && (admin.admin_whatsapp || admin.admin_phone))
          .map(admin => ({
            id: admin.id,
            name: admin.admin_name,
            phone: admin.admin_phone || admin.admin_whatsapp,
            whatsapp: admin.admin_whatsapp || admin.admin_phone,
            role: admin.role
          }));
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, admins })
        };
      } else {
        // Admin loading their own settings - requires auth
        const authResult = requireMinimumRole(event, 'system_admin');
        if (!authResult.isValid) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Authentication required' })
          };
        }
        
        const adminId = authResult.user.id;
        const settings = await sql`
          SELECT setting_key, setting_value, display_name
          FROM admin_contact_settings
          WHERE is_active = true AND admin_id = ${adminId}
          ORDER BY setting_key
        `;
        const contactInfo = {};
        settings.forEach(setting => {
          contactInfo[setting.setting_key] = {
            value: setting.setting_value,
            displayName: setting.display_name
          };
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ contactInfo })
        };
      }
    }
    if (event.httpMethod === 'POST') {
      // Admin only - update contact settings
      const authResult = requireMinimumRole(event, 'system_admin');
      if (!authResult.isValid) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Insufficient permissions' })
        };
      }
const { settings } = JSON.parse(event.body);
      const adminId = authResult.user.id;

    for (const [key, data] of Object.entries(settings)) {
        await sql`
          INSERT INTO admin_contact_settings (setting_key, setting_value, display_name, admin_id)
          VALUES (${key}, ${data.value}, ${data.displayName}, ${adminId})
          ON CONFLICT (setting_key, admin_id) 
          DO UPDATE SET 
            setting_value = ${data.value},
            display_name = ${data.displayName},
            updated_at = NOW()
        `;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Contact settings updated' })
      };
    }

  } catch (error) {
    console.error('Admin contact settings error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to handle contact settings' })
    };
  }
};
