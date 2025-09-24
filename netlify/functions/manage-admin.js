import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { requireSuperAdmin } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const authResult = requireSuperAdmin(event);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  const requestingUser = authResult.user;

  try {
    switch (event.httpMethod) {
      case 'GET':
        return await handleGetAdmins(headers);
      
      case 'PUT':
        return await handleUpdateAdmin(event, requestingUser, headers);
      
      case 'DELETE':
        return await handleDeleteAdmin(event, requestingUser, headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Admin management error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

const handleGetAdmins = async (headers) => {
  try {
    const admins = await sql`
      SELECT 
        u.id, u.name, u.email, u.role, u.is_approved, u.is_active,
        u.created_at, u.updated_at, u.last_login,
        COUNT(al.id) as total_actions
      FROM users u
      LEFT JOIN audit_logs al ON u.id = al.user_id
      WHERE u.role = 'admin'
      GROUP BY u.id, u.name, u.email, u.role, u.is_approved, u.is_active,
               u.created_at, u.updated_at, u.last_login
      ORDER BY u.created_at DESC
    `;

    const adminPermissions = await sql`
      SELECT user_id, permission_name, granted
      FROM admin_permissions
      WHERE user_id = ANY(${admins.map(a => a.id)})
    `;

    const permissionsByUser = adminPermissions.reduce((acc, perm) => {
      if (!acc[perm.user_id]) {
        acc[perm.user_id] = {};
      }
      acc[perm.user_id][perm.permission_name] = perm.granted;
      return acc;
    }, {});

    const enrichedAdmins = admins.map(admin => ({
      ...admin,
      permissions: permissionsByUser[admin.id] || {},
      lastLoginFormatted: admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        admins: enrichedAdmins,
        totalCount: admins.length
      })
    };

  } catch (error) {
    console.error('Get admins error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve admin users' })
    };
  }
};

const handleUpdateAdmin = async (event, requestingUser, headers) => {
  try {
    const { adminId, updates } = JSON.parse(event.body);
    
    if (!adminId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Admin ID is required' })
      };
    }

    const targetAdmin = await sql`
      SELECT id, name, email, role, is_active FROM users 
      WHERE id = ${adminId} AND role = 'admin'
    `;

    if (targetAdmin.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Admin user not found' })
      };
    }

    const updateFields = {};
    const auditDetails = { adminId, previousState: targetAdmin[0] };

    if (updates.isActive !== undefined) {
      updateFields.is_active = updates.isActive;
      auditDetails.action = updates.isActive ? 'ACTIVATE_ADMIN' : 'DEACTIVATE_ADMIN';
    }

    if (updates.name) {
      updateFields.name = updates.name;
      auditDetails.nameChanged = { from: targetAdmin[0].name, to: updates.name };
    }

    if (updates.password) {
      if (updates.password.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Password must be at least 8 characters long' })
        };
      }
      
      const hashedPassword = await bcrypt.hash(updates.password, 12);
      updateFields.password_hash = hashedPassword;
      auditDetails.passwordChanged = true;
    }

    if (updates.permissions) {
      await sql`DELETE FROM admin_permissions WHERE user_id = ${adminId}`;
      
      for (const [permission, granted] of Object.entries(updates.permissions)) {
        await sql`
          INSERT INTO admin_permissions (user_id, permission_name, granted, granted_by, created_at)
          VALUES (${adminId}, ${permission}, ${granted}, ${requestingUser.userId}, NOW())
        `;
      }
      
      auditDetails.permissionsUpdated = updates.permissions;
    }

    if (Object.keys(updateFields).length > 0) {
      updateFields.updated_at = new Date();
      
      const updateQuery = `
        UPDATE users 
        SET ${Object.keys(updateFields).map(key => `${key} = $${Object.keys(updateFields).indexOf(key) + 2}`).join(', ')}
        WHERE id = $1
      `;
      
      const values = [adminId, ...Object.values(updateFields)];
      await sql([updateQuery], ...values);
    }

    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        details, ip_address, created_at
      ) VALUES (
        ${requestingUser.userId}, 'UPDATE_ADMIN', 'user', ${adminId},
        ${JSON.stringify(auditDetails)},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Admin user updated successfully'
      })
    };

  } catch (error) {
    console.error('Update admin error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update admin user' })
    };
  }
};

const handleDeleteAdmin = async (event, requestingUser, headers) => {
  try {
    const pathParts = event.path.split('/');
    const adminId = pathParts[pathParts.length - 1];

    if (!adminId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Admin ID is required' })
      };
    }

    const targetAdmin = await sql`
      SELECT id, name, email FROM users 
      WHERE id = ${adminId} AND role = 'admin'
    `;

    if (targetAdmin.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Admin user not found' })
      };
    }

    await sql`
      UPDATE users 
      SET is_active = false, is_approved = false, updated_at = NOW()
      WHERE id = ${adminId}
    `;

    await sql`DELETE FROM admin_permissions WHERE user_id = ${adminId}`;

    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        details, ip_address, created_at
      ) VALUES (
        ${requestingUser.userId}, 'DELETE_ADMIN', 'user', ${adminId},
        ${JSON.stringify({ 
          adminName: targetAdmin[0].name, 
          adminEmail: targetAdmin[0].email 
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
        message: 'Admin user deleted successfully'
      })
    };

  } catch (error) {
    console.error('Delete admin error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete admin user' })
    };
  }
};
