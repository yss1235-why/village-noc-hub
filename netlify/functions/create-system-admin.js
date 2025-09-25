const bcrypt = require('bcrypt');
const { Client } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL
  });

  try {
    await client.connect();

    const { name, email, password, permissions } = JSON.parse(event.body);

    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT id FROM system_admins WHERE email = $1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Administrator with this email already exists' })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert system admin
    const result = await client.query(
      `INSERT INTO system_admins (name, email, password, permissions, is_active, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       RETURNING id, name, email, permissions, is_active, created_at`,
      [name, email, hashedPassword, JSON.stringify(permissions)]
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        message: 'System administrator created successfully',
        admin: result.rows[0]
      })
    };

  } catch (error) {
    console.error('Error creating system admin:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Failed to create system administrator' })
    };
  } finally {
    await client.end();
  }
};
