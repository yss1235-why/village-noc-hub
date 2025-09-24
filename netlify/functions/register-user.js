import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      full_name,
      aadhaar_number,
      passport_number,
      id_code,
      police_verification,
      address,
      username,
      password,
      email,
      phone,
      center_shop_name
    } = JSON.parse(event.body);

    // Validation
    if (!full_name || !aadhaar_number || !id_code || !address || !username || !password || !email || !phone || !center_shop_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'All required fields must be provided' })
      };
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users 
      WHERE email = ${email} OR username = ${username} OR aadhaar_number = ${aadhaar_number}
    `;

    if (existingUser.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'User already exists with this email, username, or Aadhaar number' })
      };
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user with pending approval
    const newUser = await sql`
      INSERT INTO users (
        full_name, aadhaar_number, passport_number, id_code, 
        police_verification, address, username, password_hash, 
        email, phone, center_shop_name, role, is_approved, point_balance
      )
      VALUES (
        ${full_name}, ${aadhaar_number}, ${passport_number}, ${id_code},
        ${police_verification}, ${address}, ${username}, ${password_hash},
        ${email}, ${phone}, ${center_shop_name}, 'applicant', false, 0
      )
      RETURNING id, username, email
    `;

    // Log registration in audit trail
    await sql`
      INSERT INTO admin_audit_log (admin_id, action, details, ip_address)
      VALUES (
        ${newUser[0].id}, 
        'USER_REGISTRATION', 
        ${JSON.stringify({ username, email, registration_ip: event.headers['x-forwarded-for'] })},
        ${event.headers['x-forwarded-for'] || 'unknown'}
      )
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Registration successful. Please wait for admin approval.',
        user: {
          id: newUser[0].id,
          username: newUser[0].username,
          email: newUser[0].email,
          status: 'pending_approval'
        }
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle unique constraint violations
    if (error.message.includes('unique')) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Username, email, or Aadhaar number already exists' })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Registration failed. Please try again.' })
    };
  }
};
