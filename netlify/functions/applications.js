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
    // Create noc_applications table if it doesn't exist (with correct UUID type)
    await sql`
      CREATE TABLE IF NOT EXISTS noc_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_number VARCHAR(50) UNIQUE NOT NULL,
        applicant_name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        village_id UUID,
        purpose_of_noc TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        aadhaar_url VARCHAR(500),
        passport_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by UUID,
        CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected', 'needs_edit'))
      )
    `;

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
  application_number, title, applicant_name, relation, father_name, address, house_number,
  village_id, tribe_name, religion, annual_income, annual_income_words, purpose_of_noc, phone, email, status
) VALUES (
  ${applicationNumber}, ${title}, ${applicantName}, ${relation}, ${fatherName}, ${address}, ${houseNumber},
  ${villageId}, ${tribeName}, ${religion}, ${annualIncome}, ${annualIncomeWords}, ${purposeOfNOC}, ${phone}, ${email}, 'pending'
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
