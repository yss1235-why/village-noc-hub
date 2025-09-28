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
      // Public endpoint - no auth required for contact info
      const settings = await sql`
        SELECT setting_key, setting_value, display_name
        FROM admin_contact_settings
        WHERE is_active = true
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

    for (const [key, data] of Object.entries(settings)) {
        await sql`
          UPDATE admin_contact_settings 
          SET setting_value = ${data.value},
              display_name = ${data.displayName},
              updated_at = NOW()
          WHERE setting_key = ${key}
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
