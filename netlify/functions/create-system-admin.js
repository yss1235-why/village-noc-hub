const bcrypt = require('bcrypt');
const { Client } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
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

  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL
  });

  try {
    await client.connect();

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
    const existingAdmin = await client.query(
      'SELECT id FROM system_admins WHERE email = $1',
      [normalizedEmail]
    );

    if (existingAdmin.rows.length > 0) {
      // Log duplicate attempt for security
      try {
        await client.query(
          `INSERT INTO security_logs (action, details, ip_address, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [
            'DUPLICATE_ADMIN_CREATION_ATTEMPT',
            JSON.stringify({ attempted_email: normalizedEmail }),
            event.headers['x-forwarded-for'] || 'unknown'
          ]
        );
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
    const result = await client.query(
      `INSERT INTO system_admins (name, email, password, permissions, is_active, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       RETURNING id, name, email, permissions, is_active, created_at`,
      [sanitizedName, normalizedEmail, hashedPassword, JSON.stringify(permissions || {})]
    );

    // Log successful admin creation for security audit
    try {
      await client.query(
        `INSERT INTO security_logs (action, details, ip_address, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          'SYSTEM_ADMIN_CREATED',
          JSON.stringify({
            created_admin_id: result.rows[0].id,
            created_admin_email: normalizedEmail,
            creator_ip: event.headers['x-forwarded-for'] || 'unknown'
          }),
          event.headers['x-forwarded-for'] || 'unknown'
        ]
      );
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
          id: result.rows[0].id,
          name: result.rows[0].name,
          email: result.rows[0].email,
          permissions: result.rows[0].permissions,
          is_active: result.rows[0].is_active,
          created_at: result.rows[0].created_at
        }
      })
    };

  } catch (error) {
    console.error('Error creating system admin:', error);
    
    // Log failed creation attempt for security
    try {
      if (client) {
        await client.query(
          `INSERT INTO security_logs (action, details, ip_address, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [
            'SYSTEM_ADMIN_CREATION_FAILED',
            JSON.stringify({
              error_message: error.message,
              error_code: error.code || 'unknown',
              ip_address: event.headers['x-forwarded-for'] || 'unknown'
            }),
            event.headers['x-forwarded-for'] || 'unknown'
          ]
        );
      }
    } catch (logError) {
      console.error('Failed to log creation failure:', logError);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create system administrator' })
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
};
