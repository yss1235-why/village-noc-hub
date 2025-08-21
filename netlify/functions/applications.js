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
    if (event.httpMethod === 'POST') {
      const { 
        applicationNumber, 
        applicantName, 
        fatherName, 
        address, 
        villageId, 
        purposeOfNOC, 
        phone, 
        email 
      } = JSON.parse(event.body);
      
      // Insert new NOC application
      const result = await sql`
        INSERT INTO noc_applications (
          application_number, applicant_name, father_name, address, 
          village_id, purpose_of_noc, phone, email, status
        )
        VALUES (
          ${applicationNumber}, ${applicantName}, ${fatherName}, ${address},
          ${villageId}, ${purposeOfNOC}, ${phone}, ${email}, 'pending'
        )
        RETURNING id
      `;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, id: result[0].id })
      };
    }

    if (event.httpMethod === 'GET') {
      const { applicationNumber } = event.queryStringParameters;
      
      if (applicationNumber) {
        // Get specific application by number
        const application = await sql`
          SELECT a.*, v.name as village_name 
          FROM noc_applications a
          JOIN villages v ON a.village_id = v.id
          WHERE a.application_number = ${applicationNumber}
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ application: application[0] || null })
        };
      }
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
