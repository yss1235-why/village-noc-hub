import { sql } from './utils/db.js';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Get village information
      const { villageId } = event.queryStringParameters;
      
      const village = await sql`
        SELECT id, name, district, state, pin_code, admin_name, admin_email,
               COALESCE(post_office, '') as post_office,
               COALESCE(police_station, '') as police_station,
               COALESCE(sub_division, '') as sub_division
        FROM villages 
        WHERE id = ${villageId}
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ village: village[0] || null })
      };
    }

    if (event.httpMethod === 'PUT') {
      // Update village information
     const { villageId, villageName, district, state, pinCode, postOffice, policeStation, subDivision, adminName, adminEmail } = JSON.parse(event.body);
      
      // Check if village name already exists (excluding current village)
      const existingVillage = await sql`
        SELECT id FROM villages 
        WHERE name = ${villageName} AND district = ${district} AND state = ${state} AND id != ${villageId}
      `;
      
      if (existingVillage.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'A village with this name already exists in the same district and state' })
        };
      }
      
      // Update village information
      await sql`
        UPDATE villages 
        await sql`
        UPDATE villages 
        SET name = ${villageName}, 
            district = ${district}, 
            state = ${state}, 
            pin_code = ${pinCode},
            post_office = ${postOffice},
            police_station = ${policeStation},
            sub_division = ${subDivision},
            admin_name = ${adminName},
            admin_email = ${adminEmail}
        WHERE id = ${villageId}
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Village information updated successfully' 
        })
      };
    }

    // If we get here, method is not supported
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Only GET and PUT are supported.' })
    };

  } catch (error) {
    console.error('Village update error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update village information',
        details: error.message
      })
    };
  }
