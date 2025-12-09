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

  try {
    const { villageId, includeDocuments } = event.queryStringParameters || {};

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID is required' })
      };
    }

    // For PIN selection (public), we only return names and designations
    // For management (authenticated), we return more details
    const authHeader = event.headers.authorization;
    const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');
    
    let subAdmins;
    
    if (isAuthenticated && includeDocuments === 'true') {
      // Authenticated request - verify village admin access
      const authResult = requireVillageAdmin(event);
      if (!authResult.isValid) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ error: authResult.error })
        };
      }

      // Verify requesting admin belongs to this village
      if (authResult.user.villageId !== villageId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied - you can only view your village data' })
        };
      }

      // Return full details for management
      subAdmins = await sql`
        SELECT 
          sva.id,
          sva.full_name,
          sva.phone_number,
          sva.is_primary,
          sva.is_active,
          sva.is_locked,
          sva.pin_reset_required,
          sva.created_at,
          sva.aadhaar_front_image,
          sva.aadhaar_back_image,
          sva.passport_photo,
          sva.signature_image,
          sva.seal_image,
          dt.id as designation_id,
          dt.name as designation
        FROM sub_village_admins sva
        JOIN designation_types dt ON sva.designation_id = dt.id
        WHERE sva.village_id = ${villageId}
        ORDER BY sva.is_primary DESC, dt.display_order ASC, sva.created_at ASC
      `;
    } else {
      // Public request for PIN selection - return minimal info
      subAdmins = await sql`
        SELECT 
          sva.id,
          sva.full_name,
          sva.is_primary,
          sva.is_active,
          sva.is_locked,
          sva.pin_reset_required,
          dt.name as designation
        FROM sub_village_admins sva
        JOIN designation_types dt ON sva.designation_id = dt.id
        WHERE sva.village_id = ${villageId} AND sva.is_active = true
        ORDER BY sva.is_primary DESC, dt.display_order ASC
      `;
    }

    // Get designation types for forms
    const designations = await sql`
      SELECT id, name, display_order
      FROM designation_types
      WHERE is_active = true
      ORDER BY display_order ASC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        subVillageAdmins: subAdmins,
        designations: designations,
        totalCount: subAdmins.length,
        hasAnyLocked: subAdmins.some(a => a.is_locked),
        hasAnyPinResetRequired: subAdmins.some(a => a.pin_reset_required)
      })
    };

  } catch (error) {
    console.error('Get sub village admins error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch sub village admins' })
    };
  }
};
