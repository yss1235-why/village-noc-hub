import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { requireVillageAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
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

  // Check if user is primary admin
  const isPrimaryCheck = await sql`
    SELECT is_primary FROM sub_village_admins 
    WHERE id = ${userInfo.subVillageAdminId} AND village_id = ${userInfo.villageId}
  `;

  const isPrimary = isPrimaryCheck.length > 0 && isPrimaryCheck[0].is_primary;

  try {
    switch (event.httpMethod) {
      case 'POST':
        return await handleCreate(sql, event, userInfo, isPrimary, headers);
      case 'DELETE':
        return await handleDelete(sql, event, userInfo, isPrimary, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Manage sub village admins error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Operation failed', details: error.message })
    };
  }
};

const handleCreate = async (sql, event, userInfo, isPrimary, headers) => {
  // Only primary admin can create sub village admins
  if (!isPrimary) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only primary village admin can create sub village admins' })
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

  // Validate PIN format
  if (!/^\d{4}$/.test(pin)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'PIN must be exactly 4 digits' })
    };
  }

  // Validate phone number
  if (!/^\d{10}$/.test(phoneNumber.replace(/\D/g, ''))) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Phone number must be 10 digits' })
    };
  }

  // Check for duplicate phone number in village
  const existingPhone = await sql`
    SELECT id FROM sub_village_admins 
    WHERE village_id = ${userInfo.villageId} AND phone_number = ${phoneNumber}
  `;

  if (existingPhone.length > 0) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'Phone number already exists for another sub village admin' })
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

  // Create sub village admin
  const newAdmin = await sql`
    INSERT INTO sub_village_admins (
      village_id, full_name, designation_id, phone_number,
      aadhaar_front_image, aadhaar_back_image, passport_photo,
      signature_image, seal_image, pin_hash, is_primary,
      is_active, created_by, created_at, updated_at
    ) VALUES (
      ${userInfo.villageId}, ${fullName}, ${designationId}, ${phoneNumber},
      ${aadhaarFrontImage}, ${aadhaarBackImage}, ${passportPhoto},
      ${signatureImage}, ${sealImage}, ${pinHash}, false,
      true, ${userInfo.subVillageAdminId}, NOW(), NOW()
    )
    RETURNING id, full_name, phone_number, is_primary, created_at
  `;

  // Log the action
  const ipAddress = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  await sql`
    INSERT INTO village_admin_audit_log (
      village_id, sub_village_admin_id, sub_village_admin_name, designation,
      action_type, ip_address, details, created_at
    ) VALUES (
      ${userInfo.villageId}, ${userInfo.subVillageAdminId}, ${userInfo.subVillageAdminName}, 
      ${userInfo.designation}, 'CREATE_SUB_ADMIN', ${ipAddress},
      ${JSON.stringify({ 
        createdAdminId: newAdmin[0].id, 
        createdAdminName: fullName,
        createdAdminDesignation: designation[0].name 
      })},
      NOW()
    )
  `;

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Sub village admin created successfully',
      subVillageAdmin: {
        id: newAdmin[0].id,
        fullName: newAdmin[0].full_name,
        phoneNumber: newAdmin[0].phone_number,
        designation: designation[0].name,
        isPrimary: newAdmin[0].is_primary,
        createdAt: newAdmin[0].created_at
      }
    })
  };
};

const handleDelete = async (sql, event, userInfo, isPrimary, headers) => {
  // Only primary admin can delete sub village admins
  if (!isPrimary) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only primary village admin can delete sub village admins' })
    };
  }

  const { subVillageAdminId } = event.queryStringParameters || {};

  if (!subVillageAdminId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Sub village admin ID is required' })
    };
  }

  // Check if target admin exists and belongs to same village
  const targetAdmin = await sql`
    SELECT sva.id, sva.full_name, sva.is_primary, dt.name as designation
    FROM sub_village_admins sva
    JOIN designation_types dt ON sva.designation_id = dt.id
    WHERE sva.id = ${subVillageAdminId} AND sva.village_id = ${userInfo.villageId}
  `;

  if (targetAdmin.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Sub village admin not found' })
    };
  }

  // Cannot delete primary admin
  if (targetAdmin[0].is_primary) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Cannot delete primary village admin' })
    };
  }

  // Cannot delete self
  if (subVillageAdminId === userInfo.subVillageAdminId) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Cannot delete your own account' })
    };
  }

  // Delete the sub village admin
  await sql`
    DELETE FROM sub_village_admins WHERE id = ${subVillageAdminId}
  `;

  // Log the action
  const ipAddress = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  await sql`
    INSERT INTO village_admin_audit_log (
      village_id, sub_village_admin_id, sub_village_admin_name, designation,
      action_type, ip_address, details, created_at
    ) VALUES (
      ${userInfo.villageId}, ${userInfo.subVillageAdminId}, ${userInfo.subVillageAdminName}, 
      ${userInfo.designation}, 'DELETE_SUB_ADMIN', ${ipAddress},
      ${JSON.stringify({ 
        deletedAdminId: subVillageAdminId, 
        deletedAdminName: targetAdmin[0].full_name,
        deletedAdminDesignation: targetAdmin[0].designation 
      })},
      NOW()
    )
  `;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: `Sub village admin "${targetAdmin[0].full_name}" deleted successfully`
    })
  };
};
