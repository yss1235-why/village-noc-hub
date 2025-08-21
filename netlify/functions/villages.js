import { sql } from './utils/db.js';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Get all approved villages with more details
        const villages = await sql`
          SELECT id, name, district, state, pin_code, admin_name, created_at
          FROM villages 
          WHERE status = 'approved'
          ORDER BY state, district, name
        `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ villages })
      };
    }

    if (event.httpMethod === 'POST') {
      const { villageName, district, state, pinCode, adminName, email } = JSON.parse(event.body);
      
      // Insert new village registration
      const result = await sql`
        INSERT INTO villages (name, district, state, pin_code, admin_name, admin_email, status)
        VALUES (${villageName}, ${district}, ${state}, ${pinCode}, ${adminName}, ${email}, 'pending')
        RETURNING id
      `;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, id: result[0].id })
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
