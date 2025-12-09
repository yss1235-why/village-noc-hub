import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { authenticateUser } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // For GET requests, we allow unauthenticated access with villageId
    // For POST requests, we require authentication
    
    if (event.httpMethod === 'GET') {
      // Get villageId from query params
      const villageId = event.queryStringParameters?.villageId;
      
      if (!villageId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Village ID is required' })
        };
      }

      // Verify the request has a valid temp token (from initial login)
      const authHeader = event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' })
        };
      }

      // Check if primary admin setup is needed
      const existingPrimary = await sql`
        SELECT id FROM sub_village_admins 
        WHERE village_id = ${villageId} AND is_primary = true
      `;

      // Get village info
      const village = await sql`
        SELECT id, name, admin_name, admin_email
        FROM villages
        WHERE id = ${villageId}
      `;

      if (village.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Village not found' })
        };
      }

      // Get designations
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
          requiresSetup: existingPrimary.length === 0,
          village: village[0] || null,
          designations: designations
        })
      };
    }

    if (event.httpMethod === 'POST') {
      // Authenticate using the temp token
      const authResult = authenticateUser(event);
      if (!authResult.isValid) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ error: authResult.error })
        };
      }

      const userInfo = authResult.user;

      // Check if primary already exists
      const existingPrimary = await sql`
        SELECT id FROM sub_village_admins 
        WHERE village_id = ${userInfo.villageId} AND is_primary = true
      `;

      if (existingPrimary.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Primary village admin already exists' })
        };
      }

      const {
        fullName,
        designationId,
        phoneNumber,
        pin,
        aadhaarFrontImage,
        aadhaarBackImage,
        passportPhoto,
        signatureImage,
        sealImage
      } = JSON.parse(event.body);

      // Validate required fields
      if (!fullName || !designationId || !phoneNumber || !pin || 
          !aadhaarFrontImage || !aadhaarBackImage || !passportPhoto || 
          !signatureImage || !sealImage) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'All fields are required' })
        };
      }

      // Validate full name
      if (fullName.trim().length < 3) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Full name must be at least 3 characters' })
        };
      }

      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'PIN must be exactly 4 digits' })
        };
      }

      // Validate phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Phone number must be 10 digits' })
        };
      }

      // Verify designation exists
      const designation = await sql`
        SELECT id, name FROM designation_types WHERE id = ${designationId} AND is_active = true
      `;

      if (designation.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid designation' })
        };
      }

      // Hash the PIN
      const pinHash = await bcrypt.hash(pin, 10);

      // Create primary sub village admin
      const newPrimary = await sql`
        INSERT INTO sub_village_admins (
          village_id, full_name, designation_id, phone_number,
          aadhaar_front_image, aadhaar_back_image, passport_photo,
          signature_image, seal_image, pin_hash, is_primary,
          is_active, created_at, updated_at
        ) VALUES (
          ${userInfo.villageId}, ${fullName.trim()}, ${designationId}, ${cleanPhone},
          ${aadhaarFrontImage}, ${aadhaarBackImage}, ${passportPhoto},
          ${signatureImage}, ${sealImage}, ${pinHash}, true,
          true, NOW(), NOW()
        )
        RETURNING id, full_name
      `;

      // Log the action
      const ipAddress = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      await sql`
        INSERT INTO village_admin_audit_log (
          village_id, sub_village_admin_id, sub_village_admin_name, designation,
          action_type, ip_address, details, created_at
        ) VALUES (
          ${userInfo.villageId}, ${newPrimary[0].id}, ${fullName.trim()}, 
          ${designation[0].name}, 'PRIMARY_SETUP', ${ipAddress},
          ${JSON.stringify({ message: 'Primary village admin setup completed' })},
          NOW()
        )
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Primary village admin setup completed successfully',
          requiresPinLogin: true
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Setup primary village admin error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Setup failed', details: error.message })
    };
  }
};
