const { sql } = require('./utils/db.js');

module.exports.handler = async (event, context) => {

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET',
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

 const { villageId } = event.queryStringParameters || {};
  
  try {

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID is required' })
      };
    }

    // Get admin profile from villages table
 const village = await sql`
      SELECT 
        id,
        admin_name,
        admin_email as email,
        name as villageName,
        district,
        state,
        pin_code as pinCode,
        COALESCE(post_office, '') as postOffice,
        COALESCE(police_station, '') as policeStation,
        COALESCE(sub_division, '') as subDivision
      FROM villages 
      WHERE id = ${villageId}::uuid
    `;
    if (village.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Village not found' })
      };
    }

    // Try to get additional user info (like phone) from users table
   const user = await sql`
      SELECT phone
      FROM users 
      WHERE village_id = ${villageId}::uuid AND role = 'village_admin'
    `;

const profile = {
  adminName: village[0].admin_name,     
  email: village[0].email,
  phone: user.length > 0 ? user[0].phone : '',
  villageName: village[0].villagename,  
  district: village[0].district,
  state: village[0].state,
  pinCode: village[0].pincode,
  postOffice: village[0].postoffice || '',
  policeStation: village[0].policestation || '',
  subDivision: village[0].subdivision || ''         
};
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ profile })
    };

} catch (error) {
    console.error('Get admin profile error:', error);
    console.error('Village ID:', villageId);
    console.error('Error details:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load profile information',
        details: error.message,
        villageId: villageId || 'undefined'
     })
    };
  }
};
