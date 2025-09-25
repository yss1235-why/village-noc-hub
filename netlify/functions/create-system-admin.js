import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  // Add CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

try {

    // Parse and validate request body
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { name, email, password, permissions } = requestData;

    // Input validation
    if (!name || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name, email, and password are required' })
      };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Password strength validation
    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters long' })
      };
    }

    // Sanitize inputs
    const normalizedEmail = email.toLowerCase().trim();
    const sanitizedName = name.trim();

    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name must be between 2 and 100 characters' })
      };
    }
// Check if admin already exists
    const existingAdmin = await sql`
      SELECT id FROM system_admins WHERE email = ${normalizedEmail}
    `;

    if (existingAdmin.length > 0) {
      // Log duplicate attempt for security
     try {
        await sql`
          INSERT INTO security_logs (action, details, ip_address, created_at)
          VALUES (
            'DUPLICATE_ADMIN_CREATION_ATTEMPT',
            ${JSON.stringify({ attempted_email: normalizedEmail })},
            ${event.headers['x-forwarded-for'] || 'unknown'},
            NOW()
          )
        `;
      } catch (logError) {
        console.error('Failed to log duplicate attempt:', logError);
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Administrator with this email already exists' })
      };
    }

    // Hash password with higher salt rounds for better security
    const hashedPassword = await bcrypt.hash(password, 12);

   // Insert system admin
    const result = await sql`
      INSERT INTO system_admins (name, email, password, permissions, is_active, created_at)
      VALUES (
        ${sanitizedName}, 
        ${normalizedEmail}, 
        ${hashedPassword}, 
        ${JSON.stringify(permissions || {})}, 
        true, 
        NOW()
      )
      RETURNING id, name, email, permissions, is_active, created_at
    `;

    // Log successful admin creation for security audit
   try {
      await sql`
        INSERT INTO security_logs (action, details, ip_address, created_at)
        VALUES (
          'SYSTEM_ADMIN_CREATED',
          ${JSON.stringify({
            created_admin_id: result[0].id,
            created_admin_email: normalizedEmail,
            creator_ip: event.headers['x-forwarded-for'] || 'unknown'
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'},
          NOW()
        )
      `;
    } catch (logError) {
      console.error('Failed to log admin creation:', logError);
      // Continue execution even if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'System administrator created successfully',
        admin: {
          id: result[0].id,
          name: result[0].name,
          email: result[0].email,
          permissions: result[0].permissions,
          is_active: result[0].is_active,
          created_at: result[0].created_at
        }
      })
    };

  } catch (error) {
    console.error('Error creating system admin:', error);
    
    // Log failed creation attempt for security
    try {
      await sql`
        INSERT INTO security_logs (action, details, ip_address, created_at)
        VALUES (
          'SYSTEM_ADMIN_CREATION_FAILED',
          ${JSON.stringify({
            error_message: error.message,
            error_code: error.code || 'unknown',
            ip_address: event.headers['x-forwarded-for'] || 'unknown'
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'},
          NOW()
        )
      `;
    } catch (logError) {
      console.error('Failed to log creation failure:', logError);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create system administrator' })
    };
 }
};
