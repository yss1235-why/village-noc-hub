import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { withAuth, logSecurityEvent, hasPermission } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

const createAdminHandler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, email, password, permissions = {} } = JSON.parse(event.body);
    const requestingUser = event.user;

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Name, email, and password are required' })
      };
    }

    if (!hasPermission(requestingUser.role, 'create_admin')) {
      await logSecurityEvent(requestingUser.id, 'unauthorized_admin_creation_attempt', {
        targetEmail: email,
        ipAddress: event.headers['x-forwarded-for'] || 'unknown'
      });
      
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Insufficient permissions to create admin users' })
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Password must be at least 8 characters long' })
      };
    }

    const existingUser = await sql`
      SELECT id, email, role FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existingUser.length > 0) {
      return {
        statusCode: 409,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Email address already exists' })
      };
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newAdmin = await sql`
      INSERT INTO users (
        name, email, password_hash, role, is_approved, is_active,
        created_by, created_at, updated_at
      ) VALUES (
        ${name}, ${email.toLowerCase()}, ${hashedPassword}, 'admin', true, true,
        ${requestingUser.id}, NOW(), NOW()
      ) RETURNING id, name, email, role, is_approved, is_active, created_at
    `;

    const adminId = newAdmin[0].id;

    if (Object.keys(permissions).length > 0) {
      for (const [permission, granted] of Object.entries(permissions)) {
        await sql`
          INSERT INTO admin_permissions (
            user_id, permission_name, granted, granted_by, created_at
          ) VALUES (
            ${adminId}, ${permission}, ${granted}, ${requestingUser.id}, NOW()
          )
        `;
      }
    }

    await logSecurityEvent(requestingUser.id, 'admin_created', {
      createdAdminId: adminId,
      createdAdminEmail: email,
      createdAdminName: name,
      permissions: permissions,
      ipAddress: event.headers['x-forwarded-for'] || 'unknown'
    });

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Admin user created successfully',
        admin: {
          id: newAdmin[0].id,
          name: newAdmin[0].name,
          email: newAdmin[0].email,
          role: newAdmin[0].role,
          isApproved: newAdmin[0].is_approved,
          isActive: newAdmin[0].is_active,
          createdAt: newAdmin[0].created_at
        }
      })
    };

  } catch (error) {
    console.error('Create admin error:', error);
    
    if (event.user) {
      await logSecurityEvent(event.user.id, 'admin_creation_error', {
        error: error.message,
        ipAddress: event.headers['x-forwarded-for'] || 'unknown'
      });
    }

    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create admin user' })
    };
  }
};

export const handler = withAuth(createAdminHandler, 'super_admin');
